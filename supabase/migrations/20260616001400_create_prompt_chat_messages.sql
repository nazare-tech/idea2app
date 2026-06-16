-- Migration: Create prompt_chat_messages table
-- Description: Stores chat messages for the Prompt tab AI conversation
-- Created: 2026-02-05

-- Create prompt_chat_messages table
CREATE TABLE IF NOT EXISTS prompt_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prompt_chat_messages_project_id ON prompt_chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_prompt_chat_messages_created_at ON prompt_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_prompt_chat_messages_project_created ON prompt_chat_messages(project_id, created_at);

-- Enable Row Level Security
ALTER TABLE prompt_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view their own project's messages
CREATE POLICY "Users can view their own prompt chat messages"
  ON prompt_chat_messages
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can insert messages to their own projects
CREATE POLICY "Users can insert prompt chat messages to their projects"
  ON prompt_chat_messages
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can update their own project's messages
CREATE POLICY "Users can update their own prompt chat messages"
  ON prompt_chat_messages
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

-- Users can delete their own project's messages
CREATE POLICY "Users can delete their own prompt chat messages"
  ON prompt_chat_messages
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prompt_chat_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prompt_chat_messages_updated_at_trigger
  BEFORE UPDATE ON prompt_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_chat_messages_updated_at();

-- Add helpful comments
COMMENT ON TABLE prompt_chat_messages IS 'Stores AI chat messages for the Prompt tab where users refine their ideas';
COMMENT ON COLUMN prompt_chat_messages.id IS 'Unique identifier for the message';
COMMENT ON COLUMN prompt_chat_messages.project_id IS 'Reference to the project this message belongs to';
COMMENT ON COLUMN prompt_chat_messages.role IS 'Role of the message sender: user, assistant, or system';
COMMENT ON COLUMN prompt_chat_messages.content IS 'The actual message content';
COMMENT ON COLUMN prompt_chat_messages.metadata IS 'Additional metadata (model used, stage, etc.)';
COMMENT ON COLUMN prompt_chat_messages.created_at IS 'Timestamp when the message was created';
COMMENT ON COLUMN prompt_chat_messages.updated_at IS 'Timestamp when the message was last updated';
