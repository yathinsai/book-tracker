import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Load simple KEY=value entries from the repository-local .env file.
 * Shell environment variables win, so deployment platforms can override .env. */
export async function loadProjectEnv() {
  let source;
  try {
    source = await readFile(resolve(projectRoot, '.env'), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) throw new Error(`Invalid .env entry: ${rawLine}`);
    const [, name, rawValue] = match;
    if (process.env[name] !== undefined) continue;
    const value = rawValue.replace(/^(['"])(.*)\1$/, '$2');
    process.env[name] = value;
  }
}
