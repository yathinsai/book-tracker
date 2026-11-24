# SQLite migration plan

The current DONAR app is a static browser application. Its data is stored in browser `localStorage`, which is local to one browser origin and device. SQLite should run behind a small server API; a browser should not open the SQLite database file directly.

## Target architecture

```
Browser UI (index.html + app.js)
        │ HTTP JSON
        ▼
Node server API
        │
        ▼
SQLite database (data/donar.sqlite)
```

The browser continues to render the existing UI. The server becomes the source of truth for locations, inventory, boxes, shipments, and activity history.

## 1. Add server dependencies

Use Node 20 or newer. Install a lightweight HTTP framework and SQLite driver:

```bash
npm install express better-sqlite3
```

Add a server entry point such as `server.mjs`. Keep `data/` out of Git because it contains the local database file.

```gitignore
data/*.sqlite
data/*.sqlite-shm
data/*.sqlite-wal
```

## 2. Create the database schema

Create `db/schema.sql` with tables for the existing application entities:

- `drives`
- `locations`
- `inventory_entries`
- `boxes`
- `box_items`
- `shipments`
- `change_events`

Important columns:

```sql
CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  drive_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('collection', 'central')),
  receiving_kind TEXT CHECK (receiving_kind IN ('origin', 'location')),
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (drive_id, name)
);

CREATE TABLE inventory_entries (
  id TEXT PRIMARY KEY,
  drive_id TEXT NOT NULL,
  origin_location_id TEXT NOT NULL REFERENCES locations(id),
  current_location_id TEXT NOT NULL REFERENCES locations(id),
  entry_mode TEXT NOT NULL CHECK (entry_mode IN ('title', 'batch')),
  title TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  condition TEXT NOT NULL,
  reading_level TEXT NOT NULL,
  decision TEXT NOT NULL,
  rejection_reason TEXT NOT NULL DEFAULT '',
  donar_name TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  parent_entry_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Enable foreign keys for every database connection:

```sql
PRAGMA foreign_keys = ON;
```

## 3. Implement the API

Start with these JSON endpoints:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/state` | Load the full active-drive state |
| `PUT` | `/api/state` | Validate and save a complete state update |
| `POST` | `/api/inventory` | Add a received inventory record |
| `PATCH` | `/api/inventory/:id` | Update an inventory record |
| `DELETE` | `/api/inventory/:id` | Delete an unpacked inventory record |
| `POST` | `/api/locations` | Add an origin or location |
| `DELETE` | `/api/locations/:id` | Remove an unused non-central location |

For the initial migration, `GET /api/state` and `PUT /api/state` are enough to keep the current client-side model working. Add resource-specific endpoints after the migration is stable.

The server must enforce the same rules now enforced in `app.js`:

- quantities are positive whole numbers;
- origin and current location belong to the same drive;
- packed inventory cannot be edited or deleted until unpacked;
- a location in use cannot be removed;
- one drive can have at most one active central sorting location;
- box allocations cannot exceed inventory quantity.

Use SQLite transactions for every multi-table change, especially inventory reset, shipment reversal, packing, and deletion.

## 4. Replace the browser repository

`app.js` currently creates a repository with `localStorage`. Replace its `load`, `save`, and `replace` methods with `fetch` calls:

```js
async function load() {
  const response = await fetch('/api/state');
  if (!response.ok) throw new Error('Could not load saved data.');
  return response.json();
}

async function save(nextState) {
  const response = await fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nextState)
  });
  if (!response.ok) throw new Error('Could not save changes.');
  return response.json();
}
```

Keep client validation for fast feedback, but treat the server validation as authoritative.

## 5. Migrate existing local data

1. In the current app, use **Setup → Full JSON backup**.
2. Build a one-time Node import script that validates this JSON and inserts it in a SQLite transaction.
3. Verify totals for received, accepted, pending, rejected, packed, and shipped books.
4. Keep the JSON backup until the SQLite deployment is verified.

## 6. Update scripts and deployment

Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "node server.mjs",
    "db:migrate": "node scripts/migrate-sqlite.mjs",
    "db:seed": "node scripts/seed-sqlite.mjs"
  }
}
```

SQLite needs persistent disk storage. A purely static host cannot run it. Deploy the Node server where its database directory is durable, or use a managed database service for multi-device production use.

## 7. Verify before switching users

1. Add an origin and location; confirm both persist after a server restart.
2. Receive an individual title and a category batch.
3. Edit quantity, donor name, locations, and notes.
4. Confirm packed records cannot be deleted.
5. Reset inventory and confirm related allocations are cleared transactionally.
6. Reset sample data and confirm mock locations and inventory return.
7. Test CSV import/export and the inventory preview.
8. Run the application acceptance checks and compare counts to the exported CSV.

## Security notes

Do not expose the SQLite file over HTTP. Validate all API input, use parameterized SQL statements, protect write endpoints with authentication before deploying beyond a trusted local environment, and create regular backups of `data/donar.sqlite`.

---

## SQLite Terminal Commands

You can inspect and query the `data/donar.sqlite` file directly from the terminal using the built‑in `sqlite3` CLI.

```bash
# Open the database (interactive prompt)
sqlite3 data/donar.sqlite
```

Inside the prompt you can run common queries:

```sql
-- List all tables
.tables

-- Show schema for a table
.schema drives

-- Query drives
SELECT id, name, created_at FROM drives;

-- Show inventory entries with location names (JOIN example)
SELECT e.id, e.title, e.quantity, l.name AS location
FROM inventory_entries e
JOIN locations l ON e.current_location_id = l.id;

-- Export a table to CSV
.headers on
.mode csv
.output inventory.csv
SELECT * FROM inventory_entries;
.output stdout  -- return to terminal output
```

To quit the prompt type `.quit` or press `Ctrl+D`.

---

## Installing DB Browser for SQLite

A graphical viewer makes exploring the database easier. On macOS you can install it via Homebrew or download the app directly.

**Homebrew**:
```bash
brew install --cask db-browser-for-sqlite
```

**Manual download**:
1. Visit the official site: https://sqlitebrowser.org/dl/
2. Download the macOS `.dmg` package.
3. Open the DMG and drag **DB Browser for SQLite** to your Applications folder.

Once installed, open `data/donar.sqlite` from the app to browse tables, run SQL, and export data as CSV/JSON.

---

## Further Reading

For an overview of the entire project setup, see the main README:
[README.md](README.md)
