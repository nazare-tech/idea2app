-- Stripe webhook upserts snapshots with ON CONFLICT (user_id).
-- Fail closed when historical rows violate one-row-per-user contract.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.subscriptions
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce subscriptions.user_id uniqueness: duplicate user rows exist'
      USING HINT = 'Inspect duplicate subscriptions and resolve them deliberately before retrying this migration.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_definition
    WHERE constraint_definition.conrelid = 'public.subscriptions'::regclass
      AND constraint_definition.contype = 'u'
      AND constraint_definition.conkey = ARRAY[(
        SELECT attribute.attnum
        FROM pg_attribute attribute
        WHERE attribute.attrelid = 'public.subscriptions'::regclass
          AND attribute.attname = 'user_id'
          AND NOT attribute.attisdropped
      )]::smallint[]
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END
$$;
