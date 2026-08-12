-- Add username change tracking to profiles table
-- This should be run on Supabase, not Turso

-- Add column to track when username was last changed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_last_changed TIMESTAMP WITH TIME ZONE;

-- Add column to track username change count
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_change_count INTEGER DEFAULT 0;

-- Update existing rows to have NULL for username_last_changed (allows first change)
UPDATE profiles SET username_last_changed = NULL WHERE username_last_changed IS NULL;

-- Note: Run this manually in Supabase SQL Editor
-- This file is for documentation purposes
