import { db } from "@/db";
import { movies, tvSeries, genres, contentGenres } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import ClientHomePortal from "./ClientHomePortal";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    // 1. Fetch accepted movies from PostgreSQL
    const moviesList = await db
      .select()
      .from(movies)
      .where(eq(movies.isFiltered, 0))
      .orderBy(movies.popularity);

    // 2. Fetch accepted series from PostgreSQL
    const tvList = await db
      .select()
      .from(tvSeries)
      .where(eq(tvSeries.isFiltered, 0))
      .orderBy(tvSeries.popularity);

    // 3. Fetch all genres to build dynamic filter tabs
    const genresList = await db
      .select()
      .from(genres);

    // 4. Fetch content-genre mappings to do client-side accurate category filters
    const contentGenreLinks = await db
      .select()
      .from(contentGenres);

    // Transform database rows into clean structured objects
    const formattedMovies = moviesList.map(m => ({
      id: m.tmdbId,
      slug: m.slug,
      titleEn: m.titleEn,
      titleAr: m.titleAr || m.titleEn,
      overviewEn: m.overviewEn || "",
      overviewAr: m.overviewAr || m.overviewEn || "",
      posterPath: m.posterPath || "",
      backdropPath: m.backdropPath || "",
      releaseYear: m.releaseYear,
      voteAverage: m.voteAverage || 0,
      popularity: m.popularity || 0,
      type: "movie" as const,
      primaryGenre: m.primaryGenre,
      ageRating: m.ageRating || "PG-13"
    }));

    const formattedSeries = tvList.map(s => ({
      id: s.tmdbId,
      slug: s.slug,
      titleEn: s.nameEn,
      titleAr: s.nameAr || s.nameEn,
      overviewEn: s.overviewEn || "",
      overviewAr: s.overviewAr || s.overviewEn || "",
      posterPath: s.posterPath || "",
      backdropPath: s.backdropPath || "",
      releaseYear: s.firstAirYear,
      voteAverage: s.voteAverage || 0,
      popularity: s.popularity || 0,
      type: "tv" as const,
      primaryGenre: s.primaryGenre,
      ageRating: s.ageRating || "TV-14"
    }));

    // Combine all available content
    const allContent = [...formattedMovies, ...formattedSeries].sort((a, b) => b.popularity - a.popularity);

    return (
      <ClientHomePortal 
        initialContent={allContent}
        genres={genresList}
        genreLinks={contentGenreLinks}
      />
    );
  } catch (err: any) {
    console.error("Database loading error on homepage:", err);
    
    // In case of any un-migrated DB or boot stage, display a clean placeholder to trigger seed
    return (
      <ClientHomePortal 
        initialContent={[]}
        genres={[]}
        genreLinks={[]}
        error={err.message}
      />
    );
  }
}
