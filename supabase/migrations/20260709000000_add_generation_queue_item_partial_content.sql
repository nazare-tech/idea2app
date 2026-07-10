-- Streaming preview support for onboarding generation: the executor
-- throttle-writes partial document markdown while an item is generating so
-- the intake loading screen can render a live document preview through the
-- 2s onboarding-status poll. Cleared when the item reaches a terminal state.

ALTER TABLE generation_queue_items
  ADD COLUMN IF NOT EXISTS partial_content TEXT;

COMMENT ON COLUMN generation_queue_items.partial_content IS
  'Partial streamed document markdown while status = generating; cleared on terminal states. Read-only for clients (server-mutable like all queue item fields).';
