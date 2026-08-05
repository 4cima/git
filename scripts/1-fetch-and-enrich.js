require('dotenv').config({ path: '.env.local' });
const pLimitModule = require('p-limit');
const pLimit = pLimitModule.default || pLimitModule;
const db = require('./services/local-db');
const { generateUniqueSlug } = require('./services/slug-generator');
const { fetchMovieDetails, fetchSeriesDetails, fetchSeasonDetails } = require('./services/tmdb-api');
const { translateField } = require('./services/translation-service');
const { shouldFilterContent, getFilterReason, getFilterDetails } = require('./services/content-filter');
const { getGenreNameAr } = require('./services/genre-translations');

const CONCURRENCY = 40;
const limiter = pLimit(CONCURRENCY);

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit'));
const BATCH_LIMIT = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf(limitArg) + 1], 10) : null;
const typeArg = args.find(a => a.startsWith('--type'));
const TYPE_FILTER = typeArg ? typeArg.split('=')[1] : 'all';

const stats = { moviesProcessed: 0, moviesFiltered: 0, moviesNotFound: 0, moviesErrors: 0,
  seriesProcessed: 0, seriesFiltered: 0, seriesNotFound: 0, seriesErrors: 0, startTime: Date.now() };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function updateProgress(scriptName, updates) {
  const existing = db.prepare(`SELECT * FROM ingestion_progress WHERE script_name = ?`).get(scriptName);
  if (!existing) {
    db.prepare(`INSERT INTO ingestion_progress (script_name, last_run, status) VALUES (?, datetime('now'), 'running')`).run(scriptName);
  }
  const fields = [], values = [];
  for (const [k, v] of Object.entries(updates)) { fields.push(`${k} = ?`); values.push(v); }
  fields.push(`last_run = datetime('now')`);
  values.push(scriptName);
  db.prepare(`UPDATE ingestion_progress SET ${fields.join(', ')} WHERE script_name = ?`).run(...values);
}

async function processMovie(tmdbId) {
  try {
    const movie = await fetchMovieDetails(tmdbId);

    if (!movie) {
      db.prepare(`UPDATE movies SET is_fetched=1, is_filtered=1, filter_reason='not_found_in_tmdb', updated_at=datetime('now') WHERE tmdb_id=?`).run(tmdbId);
      stats.moviesNotFound++; return;
    }

    const filterDetails = getFilterDetails(movie);
    
    if (filterDetails.blocked) {
      if (filterDetails.needsReview) {
        // يحتاج مراجعة يدوية — مش blocked نهائي
        db.prepare(`
          UPDATE movies 
          SET is_fetched=1, is_filtered=1, filter_reason=?, filter_status='needs_review', updated_at=datetime('now') 
          WHERE tmdb_id=?
        `).run(filterDetails.reason, tmdbId);
        stats.moviesFiltered++; return;
      } else {
        // blocked نهائي
        db.prepare(`
          UPDATE movies 
          SET is_fetched=1, is_filtered=1, filter_reason=?, filter_status='blocked', updated_at=datetime('now') 
          WHERE tmdb_id=?
        `).run(filterDetails.reason, tmdbId);
        stats.moviesFiltered++; return;
      }
    }

    const title_en = movie.title || movie.original_title;
    const title_ar = await translateField(title_en, movie.translations?.translations, 'title');
    const overview_ar = await translateField(movie.overview, movie.translations?.translations, 'overview');
    
    // Exclude content genres from sync: news, talk, documentary, reality (if single-genre)
    const excludedGenreSlugs = ['news', 'talk', 'documentary', 'reality'];
    const genreSlugs = (movie.genres || []).map(g => g.slug || g.name?.toLowerCase().replace(/\s+/g, '-'));
    const isSingleExcludedGenre = genreSlugs.length === 1 && excludedGenreSlugs.includes(genreSlugs[0]);
    
    const isComplete = (title_ar && movie.vote_average >= 5 && !isSingleExcludedGenre) ? 1 : 0;

    const release_year = movie.release_date ? parseInt(movie.release_date.split('-')[0], 10) : null;
    const primary_genre = movie.genres?.[0]?.name?.toLowerCase() || null;
    const trailer = movie.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
    let age_rating = null;
    const usRelease = movie.release_dates?.results?.find(r => r.iso_3166_1 === 'US');
    if (usRelease?.release_dates?.[0]?.certification) age_rating = usRelease.release_dates[0].certification;

    const insertMovie = db.transaction(() => {
      const slug = generateUniqueSlug(db, title_en, release_year, primary_genre, 'movies');

      db.prepare(`
        INSERT INTO movies (
          tmdb_id, slug, title_en, title_ar, title_original, overview_en, overview_ar,
          poster_path, backdrop_path, release_date, release_year, runtime,
          vote_average, vote_count, popularity, trailer_key, imdb_id,
          original_language, country_of_origin, primary_genre, age_rating,
          is_fetched, is_filtered, filter_status, is_complete, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,'clean',?,datetime('now'))
        ON CONFLICT(tmdb_id) DO UPDATE SET
          slug=excluded.slug, title_en=excluded.title_en, title_ar=excluded.title_ar,
          title_original=excluded.title_original, overview_en=excluded.overview_en,
          overview_ar=excluded.overview_ar, poster_path=excluded.poster_path,
          backdrop_path=excluded.backdrop_path, release_date=excluded.release_date,
          release_year=excluded.release_year, runtime=excluded.runtime,
          vote_average=excluded.vote_average, vote_count=excluded.vote_count,
          popularity=excluded.popularity, trailer_key=excluded.trailer_key,
          imdb_id=excluded.imdb_id, original_language=excluded.original_language,
          country_of_origin=excluded.country_of_origin, primary_genre=excluded.primary_genre,
          age_rating=excluded.age_rating, is_fetched=1, is_filtered=0, filter_status='clean',
          is_complete=excluded.is_complete, updated_at=datetime('now')
      `).run(
        tmdbId, slug, title_en, title_ar || null, movie.original_title, movie.overview, overview_ar || null,
        movie.poster_path, movie.backdrop_path, movie.release_date, release_year, movie.runtime,
        movie.vote_average, movie.vote_count, movie.popularity, trailer?.key || null, movie.imdb_id,
        movie.original_language, movie.production_countries?.[0]?.iso_3166_1 || null,
        primary_genre, age_rating, isComplete
      );

      for (const genre of movie.genres || []) {
        db.prepare(`INSERT INTO genres (tmdb_id, name_en, name_ar, slug) VALUES (?,?,?,?)
          ON CONFLICT(tmdb_id) DO UPDATE SET name_ar = excluded.name_ar`)
          .run(genre.id, genre.name, getGenreNameAr(genre.name), genre.name.toLowerCase().replace(/\s+/g, '-'));
        db.prepare(`INSERT OR IGNORE INTO content_genres (content_tmdb_id, content_type, genre_tmdb_id) VALUES (?,'movie',?)`)
          .run(tmdbId, genre.id);
      }

      const castList = (movie.credits?.cast || []).slice(0, 15);
      castList.forEach((person, i) => {
        db.prepare(`INSERT OR IGNORE INTO people (tmdb_id, name_en, profile_path, gender, known_for_department, popularity) VALUES (?,?,?,?,?,?)`)
          .run(person.id, person.name, person.profile_path, person.gender, person.known_for_department, person.popularity || 0);
        db.prepare(`INSERT OR IGNORE INTO cast_crew (content_tmdb_id, content_type, person_tmdb_id, role_type, character_name, cast_order) VALUES (?,'movie',?,'cast',?,?)`)
          .run(tmdbId, person.id, person.character || '', i);
      });

      const directors = (movie.credits?.crew || []).filter(c => c.job === 'Director').slice(0, 3);
      for (const person of directors) {
        db.prepare(`INSERT OR IGNORE INTO people (tmdb_id, name_en, profile_path, gender, known_for_department, popularity) VALUES (?,?,?,?,?,?)`)
          .run(person.id, person.name, person.profile_path, person.gender, person.known_for_department, person.popularity || 0);
        db.prepare(`INSERT OR IGNORE INTO cast_crew (content_tmdb_id, content_type, person_tmdb_id, role_type, job, department) VALUES (?,'movie',?,'crew',?,?)`)
          .run(tmdbId, person.id, person.job, person.department);
      }
    });

    insertMovie();
    stats.moviesProcessed++;
  } catch (err) {
    console.error(`❌ فيلم ${tmdbId}:`, err.message);
    stats.moviesErrors++;
  }
}

async function processSeries(tmdbId) {
  try {
    const series = await fetchSeriesDetails(tmdbId);

    if (!series) {
      db.prepare(`UPDATE tv_series SET is_fetched=1, is_filtered=1, filter_reason='not_found_in_tmdb', updated_at=datetime('now') WHERE tmdb_id=?`).run(tmdbId);
      stats.seriesNotFound++; return;
    }

    const filterDetails = getFilterDetails(series);
    
    if (filterDetails.blocked) {
      if (filterDetails.needsReview) {
        // يحتاج مراجعة يدوية — مش blocked نهائي
        db.prepare(`
          UPDATE tv_series 
          SET is_fetched=1, is_filtered=1, filter_reason=?, filter_status='needs_review', updated_at=datetime('now') 
          WHERE tmdb_id=?
        `).run(filterDetails.reason, tmdbId);
        stats.seriesFiltered++; return;
      } else {
        // blocked نهائي
        db.prepare(`
          UPDATE tv_series 
          SET is_fetched=1, is_filtered=1, filter_reason=?, filter_status='blocked', updated_at=datetime('now') 
          WHERE tmdb_id=?
        `).run(filterDetails.reason, tmdbId);
        stats.seriesFiltered++; return;
      }
    }

    const name_en = series.name || series.original_name;
    const name_ar = await translateField(name_en, series.translations?.translations, 'name');
    const overview_ar = await translateField(series.overview, series.translations?.translations, 'overview');
    
    // Exclude content genres from sync: news, talk, documentary, reality (if single-genre)
    const excludedGenreSlugs = ['news', 'talk', 'documentary', 'reality'];
    const genreSlugs = (series.genres || []).map(g => g.slug || g.name?.toLowerCase().replace(/\s+/g, '-'));
    const isSingleExcludedGenre = genreSlugs.length === 1 && excludedGenreSlugs.includes(genreSlugs[0]);
    
    const isComplete = (name_ar && series.vote_average >= 5 && !isSingleExcludedGenre) ? 1 : 0;

    const first_air_year = series.first_air_date ? parseInt(series.first_air_date.split('-')[0], 10) : null;
    const primary_genre = series.genres?.[0]?.name?.toLowerCase() || null;
    const trailer = series.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
    let age_rating = null;
    const usRating = series.content_ratings?.results?.find(r => r.iso_3166_1 === 'US');
    if (usRating?.rating) age_rating = usRating.rating;
    const status = (series.status === 'Ended' || series.status === 'Canceled') ? 'ended' : 'ongoing';

    // سحب المواسم بالتفاصيل (async - خارج الـ transaction)
    const validSeasons = (series.seasons || []).filter(s => s.season_number >= 0);
    const seasonsData = [];
    for (const meta of validSeasons) {
      const details = await fetchSeasonDetails(tmdbId, meta.season_number);
      if (details) seasonsData.push(details);
      await sleep(50);
    }

    const insertSeries = db.transaction(() => {
      const slug = generateUniqueSlug(db, name_en, first_air_year, primary_genre, 'tv_series');

      db.prepare(`
        INSERT INTO tv_series (
          tmdb_id, slug, name_en, name_ar, name_original, overview_en, overview_ar,
          poster_path, backdrop_path, first_air_date, first_air_year, last_air_date,
          number_of_seasons, number_of_episodes, status, vote_average, vote_count,
          popularity, trailer_key, imdb_id, original_language, country_of_origin,
          primary_genre, age_rating, is_fetched, is_filtered, filter_status, is_complete, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0,'clean',?,datetime('now'))
        ON CONFLICT(tmdb_id) DO UPDATE SET
          slug=excluded.slug, name_en=excluded.name_en, name_ar=excluded.name_ar,
          name_original=excluded.name_original, overview_en=excluded.overview_en,
          overview_ar=excluded.overview_ar, poster_path=excluded.poster_path,
          backdrop_path=excluded.backdrop_path, first_air_date=excluded.first_air_date,
          first_air_year=excluded.first_air_year, last_air_date=excluded.last_air_date,
          number_of_seasons=excluded.number_of_seasons, number_of_episodes=excluded.number_of_episodes,
          status=excluded.status, vote_average=excluded.vote_average, vote_count=excluded.vote_count,
          popularity=excluded.popularity, trailer_key=excluded.trailer_key, imdb_id=excluded.imdb_id,
          original_language=excluded.original_language, country_of_origin=excluded.country_of_origin,
          primary_genre=excluded.primary_genre, age_rating=excluded.age_rating,
          is_fetched=1, is_filtered=0, filter_status='clean', is_complete=excluded.is_complete, updated_at=datetime('now')
      `).run(
        tmdbId, slug, name_en, name_ar || null, series.original_name, series.overview, overview_ar || null,
        series.poster_path, series.backdrop_path, series.first_air_date, first_air_year, series.last_air_date,
        series.number_of_seasons, series.number_of_episodes, status, series.vote_average, series.vote_count,
        series.popularity, trailer?.key || null, series.external_ids?.imdb_id || null,
        series.original_language, series.production_countries?.[0]?.iso_3166_1 || null,
        primary_genre, age_rating, isComplete
      );

      for (const genre of series.genres || []) {
        db.prepare(`INSERT INTO genres (tmdb_id, name_en, name_ar, slug) VALUES (?,?,?,?)
          ON CONFLICT(tmdb_id) DO UPDATE SET name_ar = excluded.name_ar`)
          .run(genre.id, genre.name, getGenreNameAr(genre.name), genre.name.toLowerCase().replace(/\s+/g, '-'));
        db.prepare(`INSERT OR IGNORE INTO content_genres (content_tmdb_id, content_type, genre_tmdb_id) VALUES (?,'tv',?)`)
          .run(tmdbId, genre.id);
      }

      const castList = (series.credits?.cast || []).slice(0, 15);
      castList.forEach((person, i) => {
        db.prepare(`INSERT OR IGNORE INTO people (tmdb_id, name_en, profile_path, gender, known_for_department, popularity) VALUES (?,?,?,?,?,?)`)
          .run(person.id, person.name, person.profile_path, person.gender, person.known_for_department, person.popularity || 0);
        db.prepare(`INSERT OR IGNORE INTO cast_crew (content_tmdb_id, content_type, person_tmdb_id, role_type, character_name, cast_order) VALUES (?,'tv',?,'cast',?,?)`)
          .run(tmdbId, person.id, person.character || '', i);
      });

      // المواسم + الحلقات الكاملة (متطابق مع الـ interface المتفق عليه مع Claude 2)
      for (const season of seasonsData) {
        const seasonAirYear = season.air_date ? parseInt(season.air_date.split('-')[0], 10) : null;

        db.prepare(`
          INSERT INTO seasons (series_tmdb_id, season_number, name_en, overview_en, poster_path, air_date, air_year, episode_count)
          VALUES (?,?,?,?,?,?,?,?)
          ON CONFLICT(series_tmdb_id, season_number) DO UPDATE SET
            name_en=excluded.name_en, overview_en=excluded.overview_en, poster_path=excluded.poster_path,
            air_date=excluded.air_date, air_year=excluded.air_year, episode_count=excluded.episode_count
        `).run(tmdbId, season.season_number, season.name, season.overview, season.poster_path, season.air_date, seasonAirYear, season.episodes?.length || 0);

        for (const episode of season.episodes || []) {
          db.prepare(`
            INSERT INTO episodes (series_tmdb_id, season_number, episode_number, name_en, overview_en, still_path, air_date, runtime, vote_average)
            VALUES (?,?,?,?,?,?,?,?,?)
            ON CONFLICT(series_tmdb_id, season_number, episode_number) DO UPDATE SET
              name_en=excluded.name_en, overview_en=excluded.overview_en, still_path=excluded.still_path,
              air_date=excluded.air_date, runtime=excluded.runtime, vote_average=excluded.vote_average
          `).run(tmdbId, season.season_number, episode.episode_number, episode.name, episode.overview, episode.still_path, episode.air_date, episode.runtime || null, episode.vote_average || 0);
        }
      }
    });

    insertSeries();
    stats.seriesProcessed++;
  } catch (err) {
    console.error(`❌ مسلسل ${tmdbId}:`, err.message);
    stats.seriesErrors++;
  }
}

function printProgress() {
  const elapsed = ((Date.now() - stats.startTime) / 60000).toFixed(1);
  console.log(`\n⏱️ ${elapsed} دقيقة`);
  console.log(`🎬 ✅${stats.moviesProcessed} 🚫${stats.moviesFiltered} ❓${stats.moviesNotFound} ❌${stats.moviesErrors}`);
  console.log(`📺 ✅${stats.seriesProcessed} 🚫${stats.seriesFiltered} ❓${stats.seriesNotFound} ❌${stats.seriesErrors}`);
}

async function processBatch(ids, processFn) {
  let count = 0;
  await Promise.all(ids.map(row => limiter(async () => {
    await processFn(row.tmdb_id);
    count++;
    if (count % 50 === 0) {
      printProgress();
      updateProgress('1-fetch-and-enrich', { last_processed_tmdb_id: row.tmdb_id });
    }
  })));
}

async function main() {
  console.log(`🚀 بدء السحب | Concurrency: ${CONCURRENCY} | Limit: ${BATCH_LIMIT || 'الكل'} | Type: ${TYPE_FILTER}\n`);

  if (TYPE_FILTER === 'all' || TYPE_FILTER === 'movies') {
    let q = `SELECT tmdb_id FROM movies WHERE is_fetched = 0 ORDER BY tmdb_id`;
    if (BATCH_LIMIT) q += ` LIMIT ${BATCH_LIMIT}`;
    const ids = db.prepare(q).all();
    console.log(`🎬 ${ids.length.toLocaleString()} فيلم في الانتظار`);
    await processBatch(ids, processMovie);
  }

  if (TYPE_FILTER === 'all' || TYPE_FILTER === 'tv') {
    let q = `SELECT tmdb_id FROM tv_series WHERE is_fetched = 0 ORDER BY tmdb_id`;
    if (BATCH_LIMIT) q += ` LIMIT ${BATCH_LIMIT}`;
    const ids = db.prepare(q).all();
    console.log(`📺 ${ids.length.toLocaleString()} مسلسل في الانتظار`);
    await processBatch(ids, processSeries);
  }

  updateProgress('1-fetch-and-enrich', { status: 'idle' });
  console.log('\n✅ اكتملت المعالجة!');
  printProgress();
  
  // Force flush stdout before exit
  await new Promise(resolve => process.stdout.write('', resolve));
}

main().catch(err => { console.error('❌ خطأ فادح:', err); process.exit(1); });
