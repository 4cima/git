import { db } from "@/db";
import { 
  movies, 
  tvSeries, 
  seasons, 
  episodes, 
  castCrew, 
  people, 
  contentGenres, 
  genres 
} from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import ClientWatchPortal from "./ClientWatchPortal";

export const dynamic = "force-dynamic";

interface WatchPageProps {
  params: Promise<{
    type: string;
    slug: string;
  }>;
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { type, slug } = await params;

  if (type !== "movie" && type !== "tv") {
    return notFound();
  }

  let contentData: any = null;
  let genresList: any[] = [];
  let castList: any[] = [];
  let seasonsList: any[] = [];
  let episodesList: any[] = [];

  try {
    if (type === "movie") {
      // 1. Fetch Movie
      const movieResult = await db
        .select()
        .from(movies)
        .where(and(eq(movies.slug, slug), eq(movies.isFiltered, 0)))
        .limit(1);

      if (movieResult.length === 0) {
        return notFound();
      }
      const movie = movieResult[0];
      
      contentData = {
        id: movie.tmdbId,
        slug: movie.slug,
        titleEn: movie.titleEn,
        titleAr: movie.titleAr || movie.titleEn,
        titleOriginal: movie.titleOriginal || movie.titleEn,
        overviewEn: movie.overviewEn || "",
        overviewAr: movie.overviewAr || movie.overviewEn || "",
        posterPath: movie.posterPath || "",
        backdropPath: movie.backdropPath || "",
        releaseDate: movie.releaseDate,
        releaseYear: movie.releaseYear,
        runtime: movie.runtime || 0,
        voteAverage: movie.voteAverage || 0,
        voteCount: movie.voteCount || 0,
        popularity: movie.popularity || 0,
        trailerKey: movie.trailerKey,
        imdbId: movie.imdbId,
        countryOfOrigin: movie.countryOfOrigin || "US",
        ageRating: movie.ageRating || "PG-13",
        type: "movie" as const
      };

      // 2. Fetch Genres
      const genresLinked = await db
        .select({
          tmdbId: genres.tmdbId,
          nameEn: genres.nameEn,
          nameAr: genres.nameAr,
          slug: genres.slug
        })
        .from(contentGenres)
        .innerJoin(genres, eq(contentGenres.genreTmdbId, genres.tmdbId))
        .where(and(eq(contentGenres.contentTmdbId, movie.tmdbId), eq(contentGenres.contentType, "movie")));
      genresList = genresLinked;

      // 3. Fetch Cast & Crew
      const castCrewLinked = await db
        .select({
          tmdbId: people.tmdbId,
          nameEn: people.nameEn,
          nameAr: people.nameAr,
          profilePath: people.profilePath,
          characterName: castCrew.characterName,
          job: castCrew.job,
          roleType: castCrew.roleType
        })
        .from(castCrew)
        .innerJoin(people, eq(castCrew.personTmdbId, people.tmdbId))
        .where(and(eq(castCrew.contentTmdbId, movie.tmdbId), eq(castCrew.contentType, "movie")))
        .orderBy(asc(castCrew.castOrder));
      castList = castCrewLinked;

    } else {
      // 1. Fetch TV Series
      const seriesResult = await db
        .select()
        .from(tvSeries)
        .where(and(eq(tvSeries.slug, slug), eq(tvSeries.isFiltered, 0)))
        .limit(1);

      if (seriesResult.length === 0) {
        return notFound();
      }
      const series = seriesResult[0];

      contentData = {
        id: series.tmdbId,
        slug: series.slug,
        titleEn: series.nameEn,
        titleAr: series.nameAr || series.nameEn,
        titleOriginal: series.nameOriginal || series.nameEn,
        overviewEn: series.overviewEn || "",
        overviewAr: series.overviewAr || series.overviewEn || "",
        posterPath: series.posterPath || "",
        backdropPath: series.backdropPath || "",
        releaseDate: series.firstAirDate,
        releaseYear: series.firstAirYear,
        runtime: 45, // default TV episodes runtime
        voteAverage: series.voteAverage || 0,
        voteCount: series.voteCount || 0,
        popularity: series.popularity || 0,
        trailerKey: series.trailerKey,
        imdbId: series.imdbId,
        countryOfOrigin: series.countryOfOrigin || "US",
        ageRating: series.ageRating || "TV-14",
        type: "tv" as const
      };

      // 2. Fetch Genres
      const genresLinked = await db
        .select({
          tmdbId: genres.tmdbId,
          nameEn: genres.nameEn,
          nameAr: genres.nameAr,
          slug: genres.slug
        })
        .from(contentGenres)
        .innerJoin(genres, eq(contentGenres.genreTmdbId, genres.tmdbId))
        .where(and(eq(contentGenres.contentTmdbId, series.tmdbId), eq(contentGenres.contentType, "tv")));
      genresList = genresLinked;

      // 3. Fetch Cast & Crew
      const castCrewLinked = await db
        .select({
          tmdbId: people.tmdbId,
          nameEn: people.nameEn,
          nameAr: people.nameAr,
          profilePath: people.profilePath,
          characterName: castCrew.characterName,
          job: castCrew.job,
          roleType: castCrew.roleType
        })
        .from(castCrew)
        .innerJoin(people, eq(castCrew.personTmdbId, people.tmdbId))
        .where(and(eq(castCrew.contentTmdbId, series.tmdbId), eq(castCrew.contentType, "tv")))
        .orderBy(asc(castCrew.castOrder));
      castList = castCrewLinked;

      // 4. Fetch Seasons
      seasonsList = await db
        .select()
        .from(seasons)
        .where(eq(seasons.seriesTmdbId, series.tmdbId))
        .orderBy(asc(seasons.seasonNumber));

      // 5. Fetch Episodes
      episodesList = await db
        .select()
        .from(episodes)
        .where(eq(episodes.seriesTmdbId, series.tmdbId))
        .orderBy(asc(episodes.seasonNumber), asc(episodes.episodeNumber));
    }

    return (
      <ClientWatchPortal
        content={contentData}
        genres={genresList}
        cast={castList}
        seasons={seasonsList}
        episodes={episodesList}
      />
    );
  } catch (err: any) {
    console.error("Watch Page DB load error:", err);
    return notFound();
  }
}
