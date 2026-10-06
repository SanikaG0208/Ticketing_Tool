import { createClient } from '@supabase/supabase-js';

for (const key of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY']) {
  if (!process.env[key]) throw new Error(`Configure ${key} in .env before starting the backend`);
}
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
export const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, options);
export function userClient(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY,
    { ...options, global: { headers: { Authorization: `Bearer ${token}` } } });
}
