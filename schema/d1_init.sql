-- Sensory-Check AI — D1 Database Schema
-- Run: wrangler d1 execute sensory-check-db --file=./schema/d1_init.sql

CREATE TABLE IF NOT EXISTS sensory_profiles (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id     TEXT NOT NULL UNIQUE,           -- Unique Product ID (URL Hash)
  product_url    TEXT NOT NULL,
  product_name   TEXT,
  product_type   TEXT NOT NULL DEFAULT 'general', -- food | electronics | general
  
  -- Core Sensory Metrics
  sweetness      REAL,       -- Sweetness 1~10 (Food)
  acidity        REAL,       -- Acidity 1~10 (Food)
  crunchiness    REAL,       -- Crunchiness 1~10 (Food)
  durability     TEXT,       -- Durability Grade A/B/C/D/F
  durability_score REAL,     -- Durability Score 0~100
  
  -- Context Matching
  context_tags   TEXT,       -- JSON array: ["camping", "gift", "solo-living"]
  
  -- Sensory Summary
  sensory_summary_ko TEXT,   -- 1-sentence Korean summary
  sensory_summary_en TEXT,   -- 1-sentence English summary
  
  -- Reliability
  noise_filter_score REAL,   -- Review reliability after ad filtering (0~100)
  review_count   INTEGER DEFAULT 0,
  avg_rating     REAL,
  
  -- Metadata
  analyzed_at    TEXT NOT NULL DEFAULT (datetime('now')),
  cache_ttl_days INTEGER NOT NULL DEFAULT 7,
  analysis_version TEXT NOT NULL DEFAULT '1.0'
);

CREATE INDEX IF NOT EXISTS idx_product_id ON sensory_profiles(product_id);
CREATE INDEX IF NOT EXISTS idx_product_type ON sensory_profiles(product_type);
CREATE INDEX IF NOT EXISTS idx_analyzed_at ON sensory_profiles(analyzed_at);

-- API Usage Tracking (per RapidAPI key)
CREATE TABLE IF NOT EXISTS api_usage (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key_hash TEXT NOT NULL,
  endpoint     TEXT NOT NULL,
  product_id   TEXT,
  response_ms  INTEGER,
  cache_hit    INTEGER DEFAULT 0, -- 0 or 1
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_api_key ON api_usage(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_created_at ON api_usage(created_at);

-- Product Popularity Counter (for cache prioritization)
CREATE TABLE IF NOT EXISTS product_popularity (
  product_id   TEXT PRIMARY KEY,
  request_count INTEGER DEFAULT 1,
  last_requested TEXT DEFAULT (datetime('now'))
);
