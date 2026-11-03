// Copy to config.js for a local shared-pilot build, then fill in your own project values.
// The publishable key is browser-safe; never put a Supabase secret key here.
window.BOOKTRACKER_CONFIG = {
  supabaseUrl: 'https://your-project-ref.supabase.co',
  supabasePublishableKey: 'sb_publishable_replace_me'
};

// false = existing browser-only localStorage MVP; true = Supabase Auth preview.
// Keep false until the transactional RPC and Supabase repository adapter are deployed.
window.FEATURE_DB = false;
