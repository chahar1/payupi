-- Migration: Fix payment schema to match Node.js implementation
-- Adds payment_id column to payments table for secure link resolution

ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(200);

-- Optional: Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON public.payments(payment_id);
