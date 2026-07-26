import { pgTable, serial, integer, varchar, text, doublePrecision, timestamp, primaryKey } from "drizzle-orm/pg-core";

// 1. Movies Table
export const movies = pgTable("movies", {
  tmdbId: integer("tmdb_id").primaryKey(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  titleEn: varchar("title_en", { length: 255 }).notNull(),
  titleAr: varchar("title_ar", { length: 255 }),
  titleOriginal: varchar("title_original", { length: 255 }),
  overviewEn: text("overview_en"),
  overviewAr: text("overview_ar"),
  posterPath: varchar("poster_path", { length: 255 }),
  backdropPath: varchar("backdrop_path", { length: 255 }),
  releaseDate: varchar("release_date", { length: 50 }),
  releaseYear: integer("release_year"),
  runtime: integer("runtime"),
  voteAverage: doublePrecision("vote_average").default(0),
  voteCount: integer("vote_count").default(0),
  popularity: doublePrecision("popularity").default(0),
  trailerKey: varchar("trailer_key", { length: 100 }),
  imdbId: varchar("imdb_id", { length: 50 }),
  originalLanguage: varchar("original_language", { length: 50 }),
  countryOfOrigin: varchar("country_of_origin", { length: 100 }),
  primaryGenre: varchar("primary_genre", { length: 100 }),
  ageRating: varchar("age_rating", { length: 50 }),
  isFetched: integer("is_fetched").default(0),
  isFiltered: integer("is_filtered").default(0),
  filterReason: varchar("filter_reason", { length: 255 }),
  isComplete: integer("is_complete").default(0),
  syncedToTurso: integer("synced_to_turso").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. TV Series Table
export const tvSeries = pgTable("tv_series", {
  tmdbId: integer("tmdb_id").primaryKey(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }),
  nameOriginal: varchar("name_original", { length: 255 }),
  overviewEn: text("overview_en"),
  overviewAr: text("overview_ar"),
  posterPath: varchar("poster_path", { length: 255 }),
  backdropPath: varchar("backdrop_path", { length: 255 }),
  firstAirDate: varchar("first_air_date", { length: 50 }),
  firstAirYear: integer("first_air_year"),
  lastAirDate: varchar("last_air_date", { length: 50 }),
  numberOfSeasons: integer("number_of_seasons").default(1),
  numberOfEpisodes: integer("number_of_episodes").default(0),
  status: varchar("status", { length: 50 }),
  voteAverage: doublePrecision("vote_average").default(0),
  voteCount: integer("vote_count").default(0),
  popularity: doublePrecision("popularity").default(0),
  trailerKey: varchar("trailer_key", { length: 100 }),
  imdbId: varchar("imdb_id", { length: 50 }),
  originalLanguage: varchar("original_language", { length: 50 }),
  countryOfOrigin: varchar("country_of_origin", { length: 100 }),
  primaryGenre: varchar("primary_genre", { length: 100 }),
  ageRating: varchar("age_rating", { length: 50 }),
  isFetched: integer("is_fetched").default(0),
  isFiltered: integer("is_filtered").default(0),
  filterReason: varchar("filter_reason", { length: 255 }),
  isComplete: integer("is_complete").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 3. Seasons Table
export const seasons = pgTable("seasons", {
  seriesTmdbId: integer("series_tmdb_id").notNull(),
  seasonNumber: integer("season_number").notNull(),
  nameEn: varchar("name_en", { length: 255 }),
  nameAr: varchar("name_ar", { length: 255 }),
  overviewEn: text("overview_en"),
  overviewAr: text("overview_ar"),
  posterPath: varchar("poster_path", { length: 255 }),
  airDate: varchar("air_date", { length: 50 }),
  airYear: integer("air_year"),
  episodeCount: integer("episode_count").default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.seriesTmdbId, table.seasonNumber] }),
}));

// 4. Episodes Table
export const episodes = pgTable("episodes", {
  seriesTmdbId: integer("series_tmdb_id").notNull(),
  seasonNumber: integer("season_number").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  nameEn: varchar("name_en", { length: 255 }),
  nameAr: varchar("name_ar", { length: 255 }),
  overviewEn: text("overview_en"),
  overviewAr: text("overview_ar"),
  stillPath: varchar("still_path", { length: 255 }),
  airDate: varchar("air_date", { length: 50 }),
  runtime: integer("runtime"),
  voteAverage: doublePrecision("vote_average").default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.seriesTmdbId, table.seasonNumber, table.episodeNumber] }),
}));

// 5. Genres Table
export const genres = pgTable("genres", {
  tmdbId: integer("tmdb_id").primaryKey(),
  nameEn: varchar("name_en", { length: 100 }).notNull(),
  nameAr: varchar("name_ar", { length: 100 }),
  slug: varchar("slug", { length: 100 }).notNull(),
});

// 6. Content-Genres Relationship Table
export const contentGenres = pgTable("content_genres", {
  contentTmdbId: integer("content_tmdb_id").notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(), // 'movie' or 'tv'
  genreTmdbId: integer("genre_tmdb_id").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.contentTmdbId, table.contentType, table.genreTmdbId] }),
}));

// 7. People Table (Cast / Crew Members)
export const people = pgTable("people", {
  tmdbId: integer("tmdb_id").primaryKey(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }),
  profilePath: varchar("profile_path", { length: 255 }),
  gender: integer("gender"),
  knownForDepartment: varchar("known_for_department", { length: 100 }),
  popularity: doublePrecision("popularity").default(0),
});

// 8. Cast & Crew Relationship Table
export const castCrew = pgTable("cast_crew", {
  id: serial("id").primaryKey(),
  contentTmdbId: integer("content_tmdb_id").notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(), // 'movie' or 'tv'
  personTmdbId: integer("person_tmdb_id").notNull(),
  roleType: varchar("role_type", { length: 50 }).notNull(), // 'cast' or 'crew'
  characterName: varchar("character_name", { length: 255 }),
  job: varchar("job", { length: 255 }),
  department: varchar("department", { length: 255 }),
  castOrder: integer("cast_order"),
});

// 9. Reviews / Comments Table
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  contentTmdbId: integer("content_tmdb_id").notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(), // 'movie' or 'tv'
  authorName: varchar("author_name", { length: 100 }).notNull(),
  rating: integer("rating").default(5),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
