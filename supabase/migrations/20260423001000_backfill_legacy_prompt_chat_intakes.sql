-- Backfill canonical intake rows for legacy projects created through Prompt Chat.
--
-- This is intentionally non-destructive: legacy prompt_chat_messages are preserved.
-- Existing project_intakes are left untouched because project_intakes.project_id is unique.

INSERT INTO project_intakes (
  project_id,
  user_id,
  schema_version,
  original_idea,
  questions_json,
  answers_json,
  raw_payload_json,
  generated_summary,
  source,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.user_id,
  'idea-intake-v1',
  BTRIM(p.description),
  '[]'::jsonb,
  '[]'::jsonb,
  jsonb_build_object(
    'schemaVersion', 'idea-intake-v1',
    'originalIdea', BTRIM(p.description),
    'questions', '[]'::jsonb,
    'answers', '[]'::jsonb,
    'source', 'prompt-chat',
    'createdAt', COALESCE(p.created_at, NOW())
  ),
  BTRIM(p.description),
  'prompt-chat',
  COALESCE(p.created_at, NOW()),
  COALESCE(p.updated_at, p.created_at, NOW())
FROM projects p
WHERE NULLIF(BTRIM(p.description), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM project_intakes pi
    WHERE pi.project_id = p.id
  )
ON CONFLICT (project_id) DO NOTHING;
