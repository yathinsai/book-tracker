import { readFile } from 'node:fs/promises';
import { saveStateToSqlite } from './sqlite-store.mjs';

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Usage: node import-json.mjs <path-to-json>');
  process.exit(1);
}
(async () => {
  try {
    const raw = await readFile(jsonPath, 'utf8');
    const state = JSON.parse(raw);
    const result = await saveStateToSqlite(state);
    console.log('Import completed:', JSON.stringify(result));
  } catch (err) {
    console.error('Error importing JSON:', err);
    process.exit(1);
  }
})();
