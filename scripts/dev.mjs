import { loadProjectEnv } from './load-project-env.mjs';

await loadProjectEnv();
await import('./build-static.mjs');
process.env.STATIC_ROOT = 'dist';
await import('./dev-server.mjs');
