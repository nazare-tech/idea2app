-- Migration: Create mockups table
-- Description: Stores ASCII art mockups showing information architecture based on MVP plans
-- Created: 2026-02-22

-- Create mockups table
CREATE TABLE IF NOT EXISTS mockups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  model_used TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mockups_project_id ON mockups(project_id);
CREATE INDEX IF NOT EXISTS idx_mockups_created_at ON mockups(created_at);
CREATE INDEX IF NOT EXISTS idx_mockups_project_created ON mockups(project_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE mockups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view their own project's mockups
CREATE POLICY "Users can view their own mockups"
  ON mockups
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can insert mockups to their own projects
CREATE POLICY "Users can insert mockups to their projects"
  ON mockups
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can update their own project's mockups
CREATE POLICY "Users can update their own mockups"
  ON mockups
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own project's mockups
CREATE POLICY "Users can delete their own mockups"
  ON mockups
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mockups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mockups_updated_at_trigger
  BEFORE UPDATE ON mockups
  FOR EACH ROW
  EXECUTE FUNCTION update_mockups_updated_at();

-- Add helpful comments
COMMENT ON TABLE mockups IS 'Stores ASCII art mockups showing information architecture based on MVP plans';
COMMENT ON COLUMN mockups.id IS 'Unique identifier for the mockup';
COMMENT ON COLUMN mockups.project_id IS 'Reference to the project this mockup belongs to';
COMMENT ON COLUMN mockups.content IS 'ASCII art mockup content';
COMMENT ON COLUMN mockups.model_used IS 'AI model used to generate the mockup';
COMMENT ON COLUMN mockups.metadata IS 'Additional metadata (source, generation parameters, etc.)';
COMMENT ON COLUMN mockups.created_at IS 'Timestamp when the mockup was created';
COMMENT ON COLUMN mockups.updated_at IS 'Timestamp when the mockup was last updated';
