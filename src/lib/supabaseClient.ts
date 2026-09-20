import { createClient } from '@supabase/supabase-js';

// Server-only names (no NEXT_PUBLIC_) so Vercel can store them as private secrets.
// Prefer SUPABASE_*; fall back to NEXT_PUBLIC_* for local .env compatibility.
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://placeholder-project.supabase.co';

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
