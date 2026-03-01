-- Migration: Fix merchant schema to match Node.js implementation
-- Adds connected_on columns and ensures user_id is unique for upsert logic

ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS phonepe_connected_on TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paytm_connected_on TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bharatpe_connected_on TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS freecharge_connected_on TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gpay_connected_on TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sbi_connected_on TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hdfc_connected_on TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS amazon_connected_on TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mobikwik_connected_on TIMESTAMPTZ;

-- Add unique constraint to user_id to allow upsert by user_id
-- Note: This may fail if duplicate user_id records already exist. 
-- In that case, manually clean up duplicates before running.
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'merchants_user_id_key'
    ) THEN
        ALTER TABLE public.merchants ADD CONSTRAINT merchants_user_id_key UNIQUE (user_id);
    END IF;
END $$;
