const required = (name, value) => {
  if (!value?.trim()) throw new Error(`Missing required environment variable: ${name}`);
  return value.trim();
};

const assertSupabaseUrl = (value) => {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) {
    throw new Error('SUPABASE_URL must be an HTTPS *.supabase.co project URL.');
  }
  return url.toString().replace(/\/$/, '');
};

const assertKeyPrefix = (name, value, prefix) => {
  if (!value.startsWith(prefix)) throw new Error(`${name} must start with ${prefix}.`);
  return value;
};

/**
 * Returns configuration safe to supply to browser-facing code.
 * Authorization still depends on Supabase Auth and Row Level Security.
 */
export function getPublicSupabaseConfig(environment = process.env) {
  const url = assertSupabaseUrl(required('SUPABASE_URL', environment.SUPABASE_URL));
  const publishableKey = assertKeyPrefix(
    'SUPABASE_PUBLISHABLE_KEY',
    required('SUPABASE_PUBLISHABLE_KEY', environment.SUPABASE_PUBLISHABLE_KEY),
    'sb_publishable_'
  );
  return Object.freeze({ url, publishableKey });
}

/**
 * Returns configuration for trusted Node.js-only code such as an admin tool,
 * Edge Function equivalent, or migration helper. Never import this into UI code.
 */
export function getServerSupabaseConfig(environment = process.env) {
  const publicConfig = getPublicSupabaseConfig(environment);
  const secretKey = assertKeyPrefix(
    'SUPABASE_SECRET_KEY',
    required('SUPABASE_SECRET_KEY', environment.SUPABASE_SECRET_KEY),
    'sb_secret_'
  );
  return Object.freeze({ ...publicConfig, secretKey });
}
