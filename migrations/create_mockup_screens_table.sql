-- Migration: Create mockup_screens table
-- Description: Stores per-screen wiretext wireframe data linked to mockup versions
-- Created: 2026-02-26

CREATE TABLE IF NOT EXISTS mockup_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mockup_id UUID NOT NULL REFERENCES mockups(id) ON DELETE CASCADE,
  screen_name TEXT NOT NULL,
  screen_order INTEGER NOT NULL DEFAULT 0,
  wire_objects JSONB NOT NULL DEFAULT '[]'::jsonb,
  ascii_art TEXT,
  wiretext_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mockup_screens_mockup_id ON mockup_screens(mockup_id);
CREATE INDEX IF NOT EXISTS idx_mockup_screens_order ON mockup_screens(mockup_id, screen_order ASC);

-- Enable RLS
ALTER TABLE mockup_screens ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view screens belonging to their mockups
CREATE POLICY "Users can view their own mockup screens"
  ON mockup_screens FOR SELECT
  USING (
    mockup_id IN (
      SELECT m.id FROM mockups m
      JOIN projects p ON m.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLS: Users can insert screens to their mockups
CREATE POLICY "Users can insert mockup screens"
  ON mockup_screens FOR INSERT
  WITH CHECK (
    mockup_id IN (
      SELECT m.id FROM mockups m
      JOIN projects p ON m.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLS: Users can delete their mockup screens
CREATE POLICY "Users can delete their own mockup screens"
  ON mockup_screens FOR DELETE
  USING (
    mockup_id IN (
      SELECT m.id FROM mockups m
      JOIN projects p ON m.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

COMMENT ON TABLE mockup_screens IS 'Per-screen wiretext wireframe data linked to mockup versions';
COMMENT ON COLUMN mockup_screens.wire_objects IS 'Raw wiretext component objects (JSON array)';
COMMENT ON COLUMN mockup_screens.ascii_art IS 'Rendered ASCII art from wiretext render_wireframe tool';
COMMENT ON COLUMN mockup_screens.wiretext_url IS 'Editable wiretext.app URL from create_wireframe tool';
