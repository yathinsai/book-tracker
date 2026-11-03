import { getPublicSupabaseConfig, getServerSupabaseConfig } from '../config/environment.mjs';

async function loadCreateClient() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient;
  } catch (error) {
    throw new Error(
      'The Supabase connector needs @supabase/supabase-js. Install it with: npm install @supabase/supabase-js',
      { cause: error }
    );
  }
}

/**
 * Creates a client scoped to the signed-in user when used with a publishable key.
 * This is appropriate for browser-compatible or user-session Node code only.
 */
export async function createPublicSupabaseConnector(environment = process.env) {
  const createClient = await loadCreateClient();
  const { url, publishableKey } = getPublicSupabaseConfig(environment);
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/**
 * Creates a privileged server-only client. RLS is bypassed by secret-key requests.
 * Keep this function out of the static app, Cloudflare Pages build output, and Git logs.
 */
export async function createServerSupabaseConnector(environment = process.env) {
  const createClient = await loadCreateClient();
  const { url, secretKey } = getServerSupabaseConfig(environment);
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
