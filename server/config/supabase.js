import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url))
});
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const baseOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
};

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY precisam estar configuradas.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, baseOptions);

export const createUserSupabaseClient = (accessToken) => createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    ...baseOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  }
);
