import { db } from "@/db";
import { 
  movies, 
  tvSeries, 
  seasons, 
  episodes, 
  genres, 
  contentGenres, 
  people, 
  castCrew 
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { 
  fetchMovieDetails, 
  fetchSeriesDetails, 
  fetchSeasonDetails, 
  translateField, 
  getTmdbTranslation 
} from "./tmdb";
import { generateUniqueSlug } from "./slug-generator";
import { 
  shouldFilterContent, 
  getFilterReason, 
  pickDisplayCertification 
} from "./content-filter";
import { getGenreNameAr } from "./genre-translations";

export interface IngestionResult {
  success: boolean;
  filtered: boolean;
  reason?: string;
  title?: string;
  type: "movie" | "tv";
  tmdbId: number;
}

/**
 * Ingests a single Movie by TMDB ID
 */
export async function ingestMovie(tmdbId: number): Promise<IngestionResult> {
  try {
    const rawMovie = await fetchMovieDetails(tmdbId);
    
    if (!rawMovie) {
      return { success: false, filtered: false, reason: "Not found in TMDB", type: "movie", tmdbId };
    }

    // Apply Safety Filter v2.0
    if (shouldFilterContent(rawMovie)) {
      const reason = getFilterReason(rawMovie);
      
      // Save as filtered in DB to keep track of audited items
      const slug = await generateUniqueSlug(rawMovie.title || rawMovie.original_title || "filtered", null, "movies");
      
      await db.insert(movies).values({
        tmdbId: tmdbId,
        slug,
        titleEn: rawMovie.title || rawMovie.original_title || "Filtered",
        isFetched: 1,
        isFiltered: 1,
        filterReason: reason,
        isComplete: 0,
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: movies.tmdbId,
        set: {
          isFetched: 1,
          isFiltered: 1,
          filterReason: reason,
          isComplete: 0,
          updatedAt: new Date()
        }
      });

      return { success: true, filtered: true, reason, title: rawMovie.title, type: "movie", tmdbId };
    }

    // Process valid content
    const titleEn = rawMovie.title || rawMovie.original_title || "Untitled";
    const releaseYear = rawMovie.release_date ? parseInt(rawMovie.release_date.split('-')[0], 10) : null;
    const primaryGenre = rawMovie.genres?.[0]?.name?.toLowerCase() || null;
    
    // Translation fallback
    const titleAr = await translateField(titleEn, rawMovie.translations?.translations, 'title');
    const overviewAr = await translateField(rawMovie.overview, rawMovie.translations?.translations, 'overview');
    
    const isComplete = titleAr ? 1 : 0;
    const trailer = rawMovie.videos?.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') || 
                    rawMovie.videos?.results?.find((v: any) => v.site === 'YouTube');
    const ageRating = pickDisplayCertification(rawMovie) || "PG-13";

    // Create unique SEO friendly slug
    const slug = await generateUniqueSlug(titleEn, releaseYear, "movies");

    // Insert movie to database
    await db.insert(movies).values({
      tmdbId: tmdbId,
      slug,
      titleEn,
      titleAr,
      titleOriginal: rawMovie.original_title || titleEn,
      overviewEn: rawMovie.overview || "",
      overviewAr,
      posterPath: rawMovie.poster_path,
      backdropPath: rawMovie.backdrop_path,
      releaseDate: rawMovie.release_date,
      releaseYear,
      runtime: rawMovie.runtime || 0,
      voteAverage: rawMovie.vote_average || 0,
      voteCount: rawMovie.vote_count || 0,
      popularity: rawMovie.popularity || 0,
      trailerKey: trailer?.key || null,
      imdbId: rawMovie.imdb_id,
      originalLanguage: rawMovie.original_language,
      countryOfOrigin: rawMovie.production_countries?.[0]?.iso_3166_1 || null,
      primaryGenre,
      ageRating,
      isFetched: 1,
      isFiltered: 0,
      isComplete,
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: movies.tmdbId,
      set: {
        slug,
        titleEn,
        titleAr,
        titleOriginal: rawMovie.original_title || titleEn,
        overviewEn: rawMovie.overview || "",
        overviewAr,
        posterPath: rawMovie.poster_path,
        backdropPath: rawMovie.backdrop_path,
        releaseDate: rawMovie.release_date,
        releaseYear,
        runtime: rawMovie.runtime || 0,
        voteAverage: rawMovie.vote_average || 0,
        voteCount: rawMovie.vote_count || 0,
        popularity: rawMovie.popularity || 0,
        trailerKey: trailer?.key || null,
        imdbId: rawMovie.imdb_id,
        originalLanguage: rawMovie.original_language,
        countryOfOrigin: rawMovie.production_countries?.[0]?.iso_3166_1 || null,
        primaryGenre,
        ageRating,
        isFetched: 1,
        isFiltered: 0,
        isComplete,
        updatedAt: new Date()
      }
    });

    // Save Genres & Ingest to content_genres relation
    for (const genre of rawMovie.genres || []) {
      const genreSlug = genre.name.toLowerCase().replace(/\s+/g, '-');
      await db.insert(genres).values({
        tmdbId: genre.id,
        nameEn: genre.name,
        nameAr: getGenreNameAr(genre.name),
        slug: genreSlug
      }).onConflictDoUpdate({
        target: genres.tmdbId,
        set: {
          nameAr: getGenreNameAr(genre.name),
          slug: genreSlug
        }
      });

      await db.insert(contentGenres).values({
        contentTmdbId: tmdbId,
        contentType: 'movie',
        genreTmdbId: genre.id
      }).onConflictDoUpdate({
        target: [contentGenres.contentTmdbId, contentGenres.contentType, contentGenres.genreTmdbId],
        set: {
          genreTmdbId: genre.id
        }
      });
    }

    // Save Top Cast (limit to 12 members)
    const castList = (rawMovie.credits?.cast || []).slice(0, 12);
    for (let i = 0; i < castList.length; i++) {
      const actor = castList[i];
      await db.insert(people).values({
        tmdbId: actor.id,
        nameEn: actor.name,
        profilePath: actor.profile_path,
        gender: actor.gender || 0,
        knownForDepartment: actor.known_for_department || "Acting",
        popularity: actor.popularity || 0
      }).onConflictDoUpdate({
        target: people.tmdbId,
        set: {
          nameEn: actor.name,
          profilePath: actor.profile_path,
          popularity: actor.popularity || 0
        }
      });

      await db.insert(castCrew).values({
        contentTmdbId: tmdbId,
        contentType: 'movie',
        personTmdbId: actor.id,
        roleType: 'cast',
        characterName: actor.character || '',
        castOrder: i
      });
    }

    // Save Director
    const directors = (rawMovie.credits?.crew || []).filter((c: any) => c.job === 'Director').slice(0, 2);
    for (const director of directors) {
      await db.insert(people).values({
        tmdbId: director.id,
        nameEn: director.name,
        profilePath: director.profile_path,
        gender: director.gender || 0,
        knownForDepartment: director.known_for_department || "Directing",
        popularity: director.popularity || 0
      }).onConflictDoUpdate({
        target: people.tmdbId,
        set: {
          nameEn: director.name,
          profilePath: director.profile_path,
          popularity: director.popularity || 0
        }
      });

      await db.insert(castCrew).values({
        contentTmdbId: tmdbId,
        contentType: 'movie',
        personTmdbId: director.id,
        roleType: 'crew',
        job: 'Director',
        department: director.department || 'Directing'
      });
    }

    return { success: true, filtered: false, title: titleEn, type: "movie", tmdbId };
  } catch (err: any) {
    console.error(`❌ Ingestion failed for movie ${tmdbId}:`, err);
    return { success: false, filtered: false, reason: err.message, type: "movie", tmdbId };
  }
}

/**
 * Ingests a TV Series (including all Seasons and Episodes) by TMDB ID
 */
export async function ingestSeries(tmdbId: number): Promise<IngestionResult> {
  try {
    const rawSeries = await fetchSeriesDetails(tmdbId);
    
    if (!rawSeries) {
      return { success: false, filtered: false, reason: "Not found in TMDB", type: "tv", tmdbId };
    }

    // Apply Safety Filter v2.0
    if (shouldFilterContent(rawSeries)) {
      const reason = getFilterReason(rawSeries);
      
      const slug = await generateUniqueSlug(rawSeries.name || rawSeries.original_name || "filtered", null, "tv_series");
      
      await db.insert(tvSeries).values({
        tmdbId: tmdbId,
        slug,
        nameEn: rawSeries.name || rawSeries.original_name || "Filtered",
        isFetched: 1,
        isFiltered: 1,
        filterReason: reason,
        isComplete: 0,
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: tvSeries.tmdbId,
        set: {
          isFetched: 1,
          isFiltered: 1,
          filterReason: reason,
          isComplete: 0,
          updatedAt: new Date()
        }
      });

      return { success: true, filtered: true, reason, title: rawSeries.name, type: "tv", tmdbId };
    }

    // Process valid series
    const nameEn = rawSeries.name || rawSeries.original_name || "Untitled Series";
    const firstAirYear = rawSeries.first_air_date ? parseInt(rawSeries.first_air_date.split('-')[0], 10) : null;
    const primaryGenre = rawSeries.genres?.[0]?.name?.toLowerCase() || null;
    
    // Translation fallback
    const nameAr = await translateField(nameEn, rawSeries.translations?.translations, 'name');
    const overviewAr = await translateField(rawSeries.overview, rawSeries.translations?.translations, 'overview');
    
    const isComplete = nameAr ? 1 : 0;
    const trailer = rawSeries.videos?.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') || 
                    rawSeries.videos?.results?.find((v: any) => v.site === 'YouTube');
    const ageRating = pickDisplayCertification(rawSeries) || "TV-14";
    const status = (rawSeries.status === 'Ended' || rawSeries.status === 'Canceled') ? 'ended' : 'ongoing';

    // Create unique SEO friendly slug
    const slug = await generateUniqueSlug(nameEn, firstAirYear, "tv_series");

    // Fetch seasons detail data (parallelized)
    const validSeasons = (rawSeries.seasons || []).filter((s: any) => s.season_number >= 0);
    const seasonsData: any[] = [];
    
    for (const meta of validSeasons) {
      try {
        const details = await fetchSeasonDetails(tmdbId, meta.season_number);
        if (details) {
          seasonsData.push(details);
        }
      } catch (e) {
        console.error(`⚠️ Failed fetching season ${meta.season_number} details for TV ${tmdbId}`);
      }
    }

    // Insert Series to database
    await db.insert(tvSeries).values({
      tmdbId: tmdbId,
      slug,
      nameEn,
      nameAr,
      nameOriginal: rawSeries.original_name || nameEn,
      overviewEn: rawSeries.overview || "",
      overviewAr,
      posterPath: rawSeries.poster_path,
      backdropPath: rawSeries.backdrop_path,
      firstAirDate: rawSeries.first_air_date,
      firstAirYear,
      lastAirDate: rawSeries.last_air_date,
      numberOfSeasons: rawSeries.number_of_seasons || 1,
      numberOfEpisodes: rawSeries.number_of_episodes || 0,
      status,
      voteAverage: rawSeries.vote_average || 0,
      voteCount: rawSeries.vote_count || 0,
      popularity: rawSeries.popularity || 0,
      trailerKey: trailer?.key || null,
      imdbId: rawSeries.external_ids?.imdb_id || null,
      originalLanguage: rawSeries.original_language,
      countryOfOrigin: rawSeries.production_countries?.[0]?.iso_3166_1 || null,
      primaryGenre,
      ageRating,
      isFetched: 1,
      isFiltered: 0,
      isComplete,
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: tvSeries.tmdbId,
      set: {
        slug,
        nameEn,
        nameAr,
        nameOriginal: rawSeries.original_name || nameEn,
        overviewEn: rawSeries.overview || "",
        overviewAr,
        posterPath: rawSeries.poster_path,
        backdropPath: rawSeries.backdrop_path,
        firstAirDate: rawSeries.first_air_date,
        firstAirYear,
        lastAirDate: rawSeries.last_air_date,
        numberOfSeasons: rawSeries.number_of_seasons || 1,
        numberOfEpisodes: rawSeries.number_of_episodes || 0,
        status,
        voteAverage: rawSeries.vote_average || 0,
        voteCount: rawSeries.vote_count || 0,
        popularity: rawSeries.popularity || 0,
        trailerKey: trailer?.key || null,
        imdbId: rawSeries.external_ids?.imdb_id || null,
        originalLanguage: rawSeries.original_language,
        countryOfOrigin: rawSeries.production_countries?.[0]?.iso_3166_1 || null,
        primaryGenre,
        ageRating,
        isFetched: 1,
        isFiltered: 0,
        isComplete,
        updatedAt: new Date()
      }
    });

    // Save Genres & Ingest to content_genres relation
    for (const genre of rawSeries.genres || []) {
      const genreSlug = genre.name.toLowerCase().replace(/\s+/g, '-');
      await db.insert(genres).values({
        tmdbId: genre.id,
        nameEn: genre.name,
        nameAr: getGenreNameAr(genre.name),
        slug: genreSlug
      }).onConflictDoUpdate({
        target: genres.tmdbId,
        set: {
          nameAr: getGenreNameAr(genre.name),
          slug: genreSlug
        }
      });

      await db.insert(contentGenres).values({
        contentTmdbId: tmdbId,
        contentType: 'tv',
        genreTmdbId: genre.id
      }).onConflictDoUpdate({
        target: [contentGenres.contentTmdbId, contentGenres.contentType, contentGenres.genreTmdbId],
        set: {
          genreTmdbId: genre.id
        }
      });
    }

    // Save Top Cast
    const castList = (rawSeries.credits?.cast || []).slice(0, 12);
    for (let i = 0; i < castList.length; i++) {
      const actor = castList[i];
      await db.insert(people).values({
        tmdbId: actor.id,
        nameEn: actor.name,
        profilePath: actor.profile_path,
        gender: actor.gender || 0,
        knownForDepartment: actor.known_for_department || "Acting",
        popularity: actor.popularity || 0
      }).onConflictDoUpdate({
        target: people.tmdbId,
        set: {
          nameEn: actor.name,
          profilePath: actor.profile_path,
          popularity: actor.popularity || 0
        }
      });

      await db.insert(castCrew).values({
        contentTmdbId: tmdbId,
        contentType: 'tv',
        personTmdbId: actor.id,
        roleType: 'cast',
        characterName: actor.character || '',
        castOrder: i
      });
    }

    // Save Seasons and Episodes
    for (const season of seasonsData) {
      const seasonAirYear = season.air_date ? parseInt(season.air_date.split('-')[0], 10) : null;
      
      // Save season
      await db.insert(seasons).values({
        seriesTmdbId: tmdbId,
        seasonNumber: season.season_number,
        nameEn: season.name || `Season ${season.season_number}`,
        nameAr: `الموسم ${season.season_number}`,
        overviewEn: season.overview || "",
        overviewAr: "", // Can translate if needed
        posterPath: season.poster_path,
        airDate: season.air_date,
        airYear: seasonAirYear,
        episodeCount: season.episodes?.length || 0
      }).onConflictDoUpdate({
        target: [seasons.seriesTmdbId, seasons.seasonNumber],
        set: {
          nameEn: season.name || `Season ${season.season_number}`,
          posterPath: season.poster_path,
          airDate: season.air_date,
          airYear: seasonAirYear,
          episodeCount: season.episodes?.length || 0
        }
      });

      // Save each episode
      for (const episode of season.episodes || []) {
        await db.insert(episodes).values({
          seriesTmdbId: tmdbId,
          seasonNumber: season.season_number,
          episodeNumber: episode.episode_number,
          nameEn: episode.name || `Episode ${episode.episode_number}`,
          nameAr: `الحلقة ${episode.episode_number}`,
          overviewEn: episode.overview || "",
          overviewAr: "", // Can translate if needed
          stillPath: episode.still_path,
          airDate: episode.air_date,
          runtime: episode.runtime || 45,
          voteAverage: episode.vote_average || 0
        }).onConflictDoUpdate({
          target: [episodes.seriesTmdbId, episodes.seasonNumber, episodes.episodeNumber],
          set: {
            nameEn: episode.name || `Episode ${episode.episode_number}`,
            stillPath: episode.still_path,
            airDate: episode.air_date,
            runtime: episode.runtime || 45,
            voteAverage: episode.vote_average || 0
          }
        });
      }
    }

    return { success: true, filtered: false, title: nameEn, type: "tv", tmdbId };
  } catch (err: any) {
    console.error(`❌ Ingestion failed for TV series ${tmdbId}:`, err);
    return { success: false, filtered: false, reason: err.message, type: "tv", tmdbId };
  }
}
