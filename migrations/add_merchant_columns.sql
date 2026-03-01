-- Migration: Add missing merchant columns
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS gpay_upi_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS is_gpay_active VARCHAR(200),
ADD COLUMN IF NOT EXISTS gpay_number VARCHAR(200),
ADD COLUMN IF NOT EXISTS sbi_upi_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS is_sbi_active VARCHAR(200),
ADD COLUMN IF NOT EXISTS sbi_number VARCHAR(200),
ADD COLUMN IF NOT EXISTS sbi_merchant_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS hdfc_upi_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS is_hdfc_active VARCHAR(200),
ADD COLUMN IF NOT EXISTS hdfc_number VARCHAR(200),
ADD COLUMN IF NOT EXISTS amazon_upi_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS is_amazon_active VARCHAR(200),
ADD COLUMN IF NOT EXISTS amazon_number VARCHAR(200),
ADD COLUMN IF NOT EXISTS amazon_cookie TEXT,
ADD COLUMN IF NOT EXISTS mobikwik_upi_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS is_mobikwik_active VARCHAR(200),
ADD COLUMN IF NOT EXISTS mobikwik_number VARCHAR(200),
ADD COLUMN IF NOT EXISTS mobikwik_token TEXT,
ADD COLUMN IF NOT EXISTS freecharge_app_fc VARCHAR(200),
ADD COLUMN IF NOT EXISTS is_freecharge_active VARCHAR(200),
ADD COLUMN IF NOT EXISTS is_bharatpe_active VARCHAR(200),
ADD COLUMN IF NOT EXISTS bharatpe_merchant_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS bharatpe_token TEXT,
ADD COLUMN IF NOT EXISTS bharatpe_cookie TEXT;

-- Standardize user connection columns in users table
ALTER TABLE public.users 
RENAME COLUMN googlepay_connected TO gpay_connected;
