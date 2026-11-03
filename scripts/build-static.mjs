import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectEnv } from './load-project-env.mjs';

await loadProjectEnv();

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDirectory = resolve(projectRoot, 'dist');
const requiredFiles = ['index.html', 'admin-login.html', 'volunteer-login.html', 'styles.css', 'app.js', 'auth.js', 'login.js', 'feature-flags.js'];
const featureDb = process.env.FEATURE_DB === 'true';
const requiredEnvironment = featureDb ? ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'] : [];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]?.trim());

if (missingEnvironment.length) {
  throw new Error(`Missing required build environment variable(s): ${missingEnvironment.join(', ')}.`);
}

const config = {
  featureDb
};

if (featureDb) {
  config.supabaseUrl = process.env.SUPABASE_URL.trim();
  config.supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY.trim();
  if (!/^https:\/\/.+\.supabase\.co$/i.test(config.supabaseUrl)) {
    throw new Error('SUPABASE_URL must be an HTTPS Supabase project URL.');
  }

  if (!config.supabasePublishableKey.startsWith('sb_publishable_')) {
    throw new Error('SUPABASE_PUBLISHABLE_KEY must be a browser-safe sb_publishable_ key.');
  }
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const filename of requiredFiles) {
  await cp(resolve(projectRoot, filename), resolve(outputDirectory, filename));
}

const configSource = `// Generated at build time. Do not add secrets to this file.\nwindow.BOOKTRACKER_CONFIG = ${JSON.stringify(config, null, 2)};\nwindow.FEATURE_DB = ${config.featureDb};\n`;
await writeFile(resolve(outputDirectory, 'config.js'), configSource, 'utf8');

for (const htmlFile of ['index.html', 'admin-login.html', 'volunteer-login.html']) {
  const htmlPath = resolve(outputDirectory, htmlFile);
  const html = await readFile(htmlPath, 'utf8');
  if (!html.includes('<!-- runtime-config -->')) throw new Error(`${htmlFile} is missing the runtime-config marker.`);
  await writeFile(htmlPath, html.replace('<!-- runtime-config -->', '<script src="config.js"></script>'), 'utf8');
}

console.log(`Built static site in ${outputDirectory}`);
