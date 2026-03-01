-- Add missing PhonePe columns to merchants table
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS phonepe_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS phonepe_device_data TEXT,
ADD COLUMN IF NOT EXISTS phonepe_group_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS phonepe_group_value VARCHAR(200);
