// Feature flags are deliberately default-off for the browser-only MVP.
// Cloudflare builds set FEATURE_DB through generated config.js. Do not enable
// database mode until the RPC and repository-adapter migrations are deployed.
if (typeof window.FEATURE_DB !== 'boolean') {
  window.FEATURE_DB = false;
}
