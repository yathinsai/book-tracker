import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const schemaPath = resolve(projectRoot, 'db/schema.sql');
const defaultDbPath = resolve(projectRoot, 'data/donar.sqlite');

function escapeSqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlValue(value, type = 'text') {
  if (value === null || value === undefined) return 'NULL';
  if (type === 'number') {
    const num = Number(value);
    return Number.isNaN(num) ? 'NULL' : String(num);
  }
  if (type === 'boolean') {
    return value ? '1' : '0';
  }
  if (type === 'json') {
    if (typeof value === 'string') return escapeSqlString(value);
    return escapeSqlString(JSON.stringify(value));
  }
  return escapeSqlString(value);
}

function buildSqlScript(schemaSql, state) {
  const drives = state.drives || [];
  const locations = state.locations || [];
  const entries = state.entries || [];
  const shipments = state.shipments || [];
  const boxes = state.boxes || [];
  const boxItems = state.boxItems || [];
  const changeEvents = state.changeEvents || [];

  const lines = [
    'PRAGMA foreign_keys = OFF;',
    'BEGIN TRANSACTION;',
    schemaSql,
    'DELETE FROM box_items;',
    'DELETE FROM boxes;',
    'DELETE FROM inventory_entries;',
    'DELETE FROM shipments;',
    'DELETE FROM locations;',
    'DELETE FROM change_events;',
    'DELETE FROM drives;'
  ];

  for (const d of drives) {
    lines.push(`INSERT INTO drives (id, name, partner_name, guidance_text, guidance_url, goal_accepted_quantity, destination_description, status, created_at) VALUES (${sqlValue(d.id)}, ${sqlValue(d.name)}, ${sqlValue(d.partner_name || '')}, ${sqlValue(d.guidance_text || '')}, ${sqlValue(d.guidance_url || '')}, ${sqlValue(d.goal_accepted_quantity, 'number')}, ${sqlValue(d.destination_description || '')}, ${sqlValue(d.status || 'active')}, ${sqlValue(d.created_at || new Date().toISOString())});`);
  }

  for (const loc of locations) {
    lines.push(`INSERT INTO locations (id, drive_id, name, type, receiving_kind, active) VALUES (${sqlValue(loc.id)}, ${sqlValue(loc.drive_id)}, ${sqlValue(loc.name)}, ${sqlValue(loc.type)}, ${sqlValue(loc.receiving_kind || null)}, ${sqlValue(loc.active !== false, 'boolean')});`);
  }

  for (const e of entries) {
    lines.push(`INSERT INTO inventory_entries (id, drive_id, origin_location_id, current_location_id, entry_mode, title, category, quantity, price, condition, reading_level, decision, rejection_reason, donar_name, notes, parent_entry_id, version, created_by, created_at, updated_at) VALUES (${sqlValue(e.id)}, ${sqlValue(e.drive_id)}, ${sqlValue(e.origin_location_id)}, ${sqlValue(e.current_location_id)}, ${sqlValue(e.entry_mode)}, ${sqlValue(e.title || '')}, ${sqlValue(e.category)}, ${sqlValue(e.quantity, 'number')}, ${sqlValue(e.price, 'number')}, ${sqlValue(e.condition)}, ${sqlValue(e.reading_level)}, ${sqlValue(e.decision)}, ${sqlValue(e.rejection_reason || '')}, ${sqlValue(e.donar_name || '')}, ${sqlValue(e.notes || '')}, ${sqlValue(e.parent_entry_id || null)}, ${sqlValue(e.version || 1, 'number')}, ${sqlValue(e.created_by || 'demo')}, ${sqlValue(e.created_at || new Date().toISOString())}, ${sqlValue(e.updated_at || new Date().toISOString())});`);
  }

  for (const s of shipments) {
    lines.push(`INSERT INTO shipments (id, drive_id, shipped_date, destination, tracking_reference, created_by, created_at) VALUES (${sqlValue(s.id)}, ${sqlValue(s.drive_id)}, ${sqlValue(s.shipped_date)}, ${sqlValue(s.destination)}, ${sqlValue(s.tracking_reference || '')}, ${sqlValue(s.created_by || 'demo')}, ${sqlValue(s.created_at || new Date().toISOString())});`);
  }

  for (const b of boxes) {
    lines.push(`INSERT INTO boxes (id, drive_id, label, status, verified_quantity, shipment_id, version) VALUES (${sqlValue(b.id)}, ${sqlValue(b.drive_id)}, ${sqlValue(b.label)}, ${sqlValue(b.status)}, ${sqlValue(b.verified_quantity || 0, 'number')}, ${sqlValue(b.shipment_id || null)}, ${sqlValue(b.version || 1, 'number')});`);
  }

  for (const bi of boxItems) {
    lines.push(`INSERT INTO box_items (id, box_id, inventory_entry_id, quantity) VALUES (${sqlValue(bi.id)}, ${sqlValue(bi.box_id)}, ${sqlValue(bi.inventory_entry_id)}, ${sqlValue(bi.quantity, 'number')});`);
  }

  for (const ev of changeEvents) {
    lines.push(`INSERT INTO change_events (id, drive_id, entity_type, entity_id, action, before_values, after_values, actor_id, timestamp) VALUES (${sqlValue(ev.id)}, ${sqlValue(ev.drive_id)}, ${sqlValue(ev.entity_type)}, ${sqlValue(ev.entity_id)}, ${sqlValue(ev.action)}, ${sqlValue(ev.before_values, 'json')}, ${sqlValue(ev.after_values, 'json')}, ${sqlValue(ev.actor_id || 'demo')}, ${sqlValue(ev.timestamp || new Date().toISOString())});`);
  }

  lines.push('COMMIT;');
  lines.push('PRAGMA foreign_keys = ON;');
  return lines.join('\n');
}

async function saveWithBetterSqlite3(BetterSqlite3, dbPath, schemaSql, state) {
  const db = new BetterSqlite3(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(schemaSql);

  const drives = state.drives || [];
  const locations = state.locations || [];
  const entries = state.entries || [];
  const shipments = state.shipments || [];
  const boxes = state.boxes || [];
  const boxItems = state.boxItems || [];
  const changeEvents = state.changeEvents || [];

  const runTransaction = db.transaction(() => {
    db.prepare('DELETE FROM box_items').run();
    db.prepare('DELETE FROM boxes').run();
    db.prepare('DELETE FROM inventory_entries').run();
    db.prepare('DELETE FROM shipments').run();
    db.prepare('DELETE FROM locations').run();
    db.prepare('DELETE FROM change_events').run();
    db.prepare('DELETE FROM drives').run();

    const insertDrive = db.prepare(`INSERT INTO drives (id, name, partner_name, guidance_text, guidance_url, goal_accepted_quantity, destination_description, status, created_at) VALUES (@id, @name, @partner_name, @guidance_text, @guidance_url, @goal_accepted_quantity, @destination_description, @status, @created_at)`);
    for (const d of drives) {
      insertDrive.run({
        id: d.id,
        name: d.name,
        partner_name: d.partner_name || '',
        guidance_text: d.guidance_text || '',
        guidance_url: d.guidance_url || '',
        goal_accepted_quantity: d.goal_accepted_quantity ?? null,
        destination_description: d.destination_description || '',
        status: d.status || 'active',
        created_at: d.created_at || new Date().toISOString()
      });
    }

    const insertLoc = db.prepare(`INSERT INTO locations (id, drive_id, name, type, receiving_kind, active) VALUES (@id, @drive_id, @name, @type, @receiving_kind, @active)`);
    for (const loc of locations) {
      insertLoc.run({
        id: loc.id,
        drive_id: loc.drive_id,
        name: loc.name,
        type: loc.type,
        receiving_kind: loc.receiving_kind || null,
        active: loc.active !== false ? 1 : 0
      });
    }

    const insertEntry = db.prepare(`INSERT INTO inventory_entries (id, drive_id, origin_location_id, current_location_id, entry_mode, title, category, quantity, price, condition, reading_level, decision, rejection_reason, donar_name, notes, parent_entry_id, version, created_by, created_at, updated_at) VALUES (@id, @drive_id, @origin_location_id, @current_location_id, @entry_mode, @title, @category, @quantity, @price, @condition, @reading_level, @decision, @rejection_reason, @donar_name, @notes, @parent_entry_id, @version, @created_by, @created_at, @updated_at)`);
    for (const e of entries) {
      insertEntry.run({
        id: e.id,
        drive_id: e.drive_id,
        origin_location_id: e.origin_location_id,
        current_location_id: e.current_location_id,
        entry_mode: e.entry_mode,
        title: e.title || '',
        category: e.category,
        quantity: Number(e.quantity),
        price: e.price !== null && e.price !== undefined ? Number(e.price) : null,
        condition: e.condition,
        reading_level: e.reading_level,
        decision: e.decision,
        rejection_reason: e.rejection_reason || '',
        donar_name: e.donar_name || '',
        notes: e.notes || '',
        parent_entry_id: e.parent_entry_id || null,
        version: Number(e.version || 1),
        created_by: e.created_by || 'demo',
        created_at: e.created_at || new Date().toISOString(),
        updated_at: e.updated_at || new Date().toISOString()
      });
    }

    const insertShipment = db.prepare(`INSERT INTO shipments (id, drive_id, shipped_date, destination, tracking_reference, created_by, created_at) VALUES (@id, @drive_id, @shipped_date, @destination, @tracking_reference, @created_by, @created_at)`);
    for (const s of shipments) {
      insertShipment.run({
        id: s.id,
        drive_id: s.drive_id,
        shipped_date: s.shipped_date,
        destination: s.destination,
        tracking_reference: s.tracking_reference || '',
        created_by: s.created_by || 'demo',
        created_at: s.created_at || new Date().toISOString()
      });
    }

    const insertBox = db.prepare(`INSERT INTO boxes (id, drive_id, label, status, verified_quantity, shipment_id, version) VALUES (@id, @drive_id, @label, @status, @verified_quantity, @shipment_id, @version)`);
    for (const b of boxes) {
      insertBox.run({
        id: b.id,
        drive_id: b.drive_id,
        label: b.label,
        status: b.status,
        verified_quantity: Number(b.verified_quantity || 0),
        shipment_id: b.shipment_id || null,
        version: Number(b.version || 1)
      });
    }

    const insertBoxItem = db.prepare(`INSERT INTO box_items (id, box_id, inventory_entry_id, quantity) VALUES (@id, @box_id, @inventory_entry_id, @quantity)`);
    for (const bi of boxItems) {
      insertBoxItem.run({
        id: bi.id,
        box_id: bi.box_id,
        inventory_entry_id: bi.inventory_entry_id,
        quantity: Number(bi.quantity)
      });
    }

    const insertEvent = db.prepare(`INSERT INTO change_events (id, drive_id, entity_type, entity_id, action, before_values, after_values, actor_id, timestamp) VALUES (@id, @drive_id, @entity_type, @entity_id, @action, @before_values, @after_values, @actor_id, @timestamp)`);
    for (const ev of changeEvents) {
      insertEvent.run({
        id: ev.id,
        drive_id: ev.drive_id,
        entity_type: ev.entity_type,
        entity_id: ev.entity_id,
        action: ev.action,
        before_values: ev.before_values ? JSON.stringify(ev.before_values) : null,
        after_values: ev.after_values ? JSON.stringify(ev.after_values) : null,
        actor_id: ev.actor_id || 'demo',
        timestamp: ev.timestamp || new Date().toISOString()
      });
    }
  });

  runTransaction();
  db.close();
}

async function saveWithSystemSqlite(dbPath, schemaSql, state) {
  const sql = buildSqlScript(schemaSql, state);
  const tempScriptPath = `${dbPath}.tmp-${Date.now()}.sql`;
  try {
    await writeFile(tempScriptPath, sql, 'utf8');
    await execFileAsync('/usr/bin/sqlite3', [dbPath, `.read ${tempScriptPath}`]);
  } finally {
    try {
      await unlink(tempScriptPath);
    } catch {
      // ignore unlink failure
    }
  }
}

export async function saveStateToSqlite(state, options = {}) {
  const dbPath = options.dbPath || defaultDbPath;
  await mkdir(dirname(dbPath), { recursive: true });

  const schemaSql = await readFile(schemaPath, 'utf8');

  let engine = 'system-sqlite3';
  let BetterSqlite3 = null;
  try {
    const mod = await import('better-sqlite3');
    BetterSqlite3 = mod.default || mod;
  } catch {
    BetterSqlite3 = null;
  }

  if (BetterSqlite3) {
    engine = 'better-sqlite3';
    await saveWithBetterSqlite3(BetterSqlite3, dbPath, schemaSql, state);
  } else {
    await saveWithSystemSqlite(dbPath, schemaSql, state);
  }

  return {
    ok: true,
    engine,
    dbPath,
    path: 'data/donar.sqlite',
    relativePath: 'data/donar.sqlite',
    savedAt: new Date().toISOString(),
    counts: {
      drives: (state.drives || []).length,
      locations: (state.locations || []).length,
      entries: (state.entries || []).length,
      shipments: (state.shipments || []).length,
      boxes: (state.boxes || []).length,
      boxItems: (state.boxItems || []).length,
      changeEvents: (state.changeEvents || []).length
    }
  };
}
