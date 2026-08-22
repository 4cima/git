-- Optimization Migration: Improve query performance and reduce rows read
-- Date: 2026-08-18
-- Purpose: Add targeted indexes to speed up common queries

-- Movies table optimizations
CREATE INDEX IF NOT EXISTS idx_movies_slug_filter 
ON movies(slug, filter_status) 
WHERE filter_status IN ('clean', 'reviewed_approved');

CREATE INDEX IF NOT EXISTS idx_movies_popularity_filtered 
ON movies(popularity DESC) 
WHERE poster_path IS NOT NULL 
  AND backdrop_path IS NOT NULL 
  AND vote_average > 0;

-- TV Series table optimizations
CREATE INDEX IF NOT EXISTS idx_series_slug_filter 
ON tv_series(slug, filter_status) 
WHERE filter_status IN ('clean', 'reviewed_approved');

CREATE INDEX IF NOT EXISTS idx_series_popularity_filtered 
ON tv_series(popularity DESC) 
WHERE poster_path IS NOT NULL 
  AND backdrop_path IS NOT NULL 
  AND vote_average > 0;

-- Update query planner statistics
ANALYZE movies;
ANALYZE tv_series;
ANALYZE genres;

-- Verify indexes were created
SELECT name, tbl_name, sql 
FROM sqlite_master 
WHERE type = 'index' 
  AND name LIKE 'idx_%_filtered'
ORDER BY name;
