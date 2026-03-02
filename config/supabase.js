const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Missing Supabase credentials in environment variables');
}

// Ensure client doesn't throw at startup even if credentials are empty
let supabase;
try {
  if (supabaseUrl) {
    supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
  } else {
    // Fallback mock or empty object to prevent crashes
    supabase = { from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: 'Missing URL' }) }) }) }) };
  }
} catch (e) {
  console.error('Supabase initialization failed:', e);
  supabase = { from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: e.message }) }) }) }) };
}

module.exports = supabase;
