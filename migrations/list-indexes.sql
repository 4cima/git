-- Indexes for list performance on local SQLite only
-- Run on data/4cima-local.db

CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_vote_count ON movies(vote_count);
CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity);
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON movies(release_date);

CREATE INDEX IF NOT EXISTS idx_tv_series_slug ON tv_series(slug);
CREATE INDEX IF NOT EXISTS idx_tv_series_tmdb_id ON tv_series(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_tv_series_vote_count ON tv_series(vote_count);
CREATE INDEX IF NOT EXISTS idx_tv_series_popularity ON tv_series(popularity);
CREATE INDEX IF NOT EXISTS idx_tv_series_first_air_date ON tv_series(first_air_date);
