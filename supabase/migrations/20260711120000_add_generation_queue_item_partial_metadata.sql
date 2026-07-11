-- Live streaming preview metadata for generating queue items.
--
-- Mirrors partial_content: written by the trusted server executor while a
-- document generates, cleared when the item reaches a terminal state. First
-- consumer is the Market Research live preview, which needs the competitor
-- source pairs (known before synthesis starts) so competitor mentions in
-- streamed text can render as links before the analyses row is saved.
-- Existing RLS/mutation policies already restrict writes to trusted server
-- paths; browser clients keep read-only access through the existing policies.

ALTER TABLE generation_queue_items
  ADD COLUMN IF NOT EXISTS partial_metadata JSONB;

COMMENT ON COLUMN generation_queue_items.partial_metadata IS
  'Server-written streaming preview metadata (e.g. live_research competitor_sources) while the item generates; cleared at terminal state.';
