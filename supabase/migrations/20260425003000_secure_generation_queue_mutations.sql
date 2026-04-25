-- Defensive follow-up for environments where the initial queue-items migration
-- was applied before mutation policies and refund_failed were tightened.

DROP POLICY IF EXISTS "Users can insert their own generation queues"
  ON generation_queues;
DROP POLICY IF EXISTS "Users can update their own generation queues"
  ON generation_queues;
DROP POLICY IF EXISTS "Users can delete their own generation queues"
  ON generation_queues;

DROP POLICY IF EXISTS "Users can insert their own generation queue items"
  ON generation_queue_items;
DROP POLICY IF EXISTS "Users can update their own generation queue items"
  ON generation_queue_items;
DROP POLICY IF EXISTS "Users can delete their own generation queue items"
  ON generation_queue_items;

ALTER TABLE generation_queue_items
  DROP CONSTRAINT IF EXISTS generation_queue_items_credit_status_check;

ALTER TABLE generation_queue_items
  ADD CONSTRAINT generation_queue_items_credit_status_check
  CHECK (credit_status IN ('unprocessed', 'charged', 'refunded', 'not_charged', 'refund_failed'));
