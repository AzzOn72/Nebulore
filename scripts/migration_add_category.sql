-- Nebulore Phase 8: Add `category` column to the `facts` table.
-- Run this once in your Supabase SQL Editor (Dashboard → SQL Editor → New Query).
--
-- The column is nullable so existing rows are unaffected.
-- The generator script (`generate_library.js`) will populate it for new inserts;
-- the mobile app uses it to filter the feed by category.

ALTER TABLE facts
ADD COLUMN IF NOT EXISTS category text;

-- Optional: create an index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_facts_category ON facts (category);
