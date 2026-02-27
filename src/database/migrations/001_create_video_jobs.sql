-- Migration: Create video_jobs table
-- Run this in Supabase SQL Editor

CREATE TABLE video_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT,
  product_category    TEXT NOT NULL CHECK (product_category IN ('bracelet', 'necklace', 'home_stones')),
  original_image_url  TEXT,
  premium_image_url   TEXT,
  model_image_url     TEXT,
  video1_url          TEXT,
  video2_url          TEXT,
  audio_url           TEXT,
  subtitle_url        TEXT,
  final_video_url     TEXT,
  status              TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN (
                        'PENDING',
                        'UPLOADING',
                        'PROCESSING_IMAGES',
                        'PROCESSING_VIDEOS',
                        'PROCESSING_AUDIO',
                        'RENDERING',
                        'COMPLETED',
                        'FAILED'
                      )),
  error_message       TEXT,
  step_timings        JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Index for querying jobs by status
CREATE INDEX idx_video_jobs_status ON video_jobs(status);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_video_jobs_updated_at
  BEFORE UPDATE ON video_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
