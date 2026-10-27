/*
 * DONAR MVP application module.
 * Organized as: constants/helpers, sample state, validation, repository,
 * domain calculations, render functions, controllers, and bootstrap.
 */
(() => {
  'use strict';

  // Configuration and shared utilities
  const STORAGE_KEY = 'bookDrive.demo.v1';
  const SCHEMA_VERSION = 1;
  const ACTIVE_DRIVE_ID = 'drive-central-texas';
  const ACTOR_ID = 'demo';
  const INVENTORY_IMPORT_HEADERS = ['entry_mode','title','category','quantity','origin_location','current_location','condition','reading_level','decision','rejection_reason','notes'];
  const MASTER_DATA = Object.freeze({
    categories: [
      { value: 'storybooks', label: 'Storybooks' },
      { value: 'nonfiction', label: 'Nonfiction' },
      { value: 'textbooks', label: 'Textbooks' },
      { value: 'other', label: 'Other' }
    ],
    conditions: [
      { value: 'unknown', label: 'Unknown' },
      { value: 'new', label: 'New' },
      { value: 'good', label: 'Good' },
      { value: 'worn', label: 'Worn' },
      { value: 'damaged', label: 'Damaged' }
    ],
    readingLevels: [
      { value: 'mixed/unknown', label: 'Mixed / unknown' },
      { value: 'early reader', label: 'Early reader' },
      { value: 'elementary', label: 'Elementary' },
      { value: 'middle school', label: 'Middle school' },
      { value: 'high school', label: 'High school' }
    ],
    decisions: [
      { value: 'pending', label: 'Pending review' },
      { value: 'accepted', label: 'Accepted' },
      { value: 'rejected', label: 'Rejected' }
    ]
  });
  const DEFAULT_LOCATIONS = Object.freeze([
    { id: 'loc-austin', drive_id: ACTIVE_DRIVE_ID, name: 'Austin Central Collection', type: 'collection', active: true },
    { id: 'loc-leander', drive_id: ACTIVE_DRIVE_ID, name: 'Leander Community Center', type: 'collection', active: true },
    { id: 'loc-cedar-park', drive_id: ACTIVE_DRIVE_ID, name: 'Cedar Park Library Collection', type: 'collection', active: true },
    { id: 'loc-central', drive_id: ACTIVE_DRIVE_ID, name: 'North Austin Sorting Hub', type: 'central', active: true }
  ]);

  const clone = value => JSON.parse(JSON.stringify(value));
  const nowIso = () => new Date().toISOString();
  const byId = (items, id) => items.find(item => item.id === id);
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

  // Fictional seed-state component
  function createSampleState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      revision: 1,
      drives: [{
        id: ACTIVE_DRIVE_ID,
        name: 'Central Texas Book Bridge',
        partner_name: 'Hill Country Reading Network (fictional)',
        guidance_text: 'Accept clean, readable books for Pre-K through grade 12. Prioritize bilingual English–Spanish titles and high-interest books.',
        guidance_url: '',
        goal_accepted_quantity: 500,
        destination_description: 'Austin Area Literacy Hub — demo destination',
        status: 'active',
        created_at: '2026-10-01T14:00:00.000Z'
      }],
      locations: clone(DEFAULT_LOCATIONS),
      entries: [
        { id: 'entry-1', drive_id: ACTIVE_DRIVE_ID, origin_location_id: 'loc-austin', current_location_id: 'loc-central', entry_mode: 'title', title: 'The Wild Robot', category: 'storybooks', quantity: 30, condition: 'good', reading_level: 'elementary', decision: 'accepted', rejection_reason: '', parent_entry_id: null, notes: '', version: 1, created_by: ACTOR_ID, created_at: '2026-10-20T15:00:00.000Z', updated_at: '2026-10-20T16:00:00.000Z' },
        { id: 'entry-2', drive_id: ACTIVE_DRIVE_ID, origin_location_id: 'loc-leander', current_location_id: 'loc-leander', entry_mode: 'batch', title: '', category: 'storybooks', quantity: 40, condition: 'unknown', reading_level: 'mixed/unknown', decision: 'pending', rejection_reason: '', parent_entry_id: null, notes: 'Awaiting transport', version: 1, created_by: ACTOR_ID, created_at: '2026-10-21T14:00:00.000Z', updated_at: '2026-10-21T14:00:00.000Z' },
        { id: 'entry-3', drive_id: ACTIVE_DRIVE_ID, origin_location_id: 'loc-cedar-park', current_location_id: 'loc-central', entry_mode: 'batch', title: '', category: 'textbooks', quantity: 10, condition: 'damaged', reading_level: 'high school', decision: 'rejected', rejection_reason: 'Water damage', parent_entry_id: null, notes: '', version: 1, created_by: ACTOR_ID, created_at: '2026-10-21T17:00:00.000Z', updated_at: '2026-10-22T15:00:00.000Z' },
        { id: 'entry-4', drive_id: ACTIVE_DRIVE_ID, origin_location_id: 'loc-leander', current_location_id: 'loc-central', entry_mode: 'batch', title: '', category: 'nonfiction', quantity: 20, condition: 'new', reading_level: 'elementary', decision: 'accepted', rejection_reason: '', parent_entry_id: null, notes: 'English–Spanish assortment', version: 1, created_by: ACTOR_ID, created_at: '2026-10-22T14:00:00.000Z', updated_at: '2026-10-22T16:00:00.000Z' }
      ],
      boxes: [
        { id: 'box-1', drive_id: ACTIVE_DRIVE_ID, label: 'BOX-001', status: 'ready', verified_quantity: 15, shipment_id: null, version: 1 },
        { id: 'box-2', drive_id: ACTIVE_DRIVE_ID, label: 'BOX-002', status: 'shipped', verified_quantity: 10, shipment_id: 'shipment-1', version: 1 }
      ],
      boxItems: [
        { id: 'box-item-1', box_id: 'box-1', inventory_entry_id: 'entry-1', quantity: 15 },
        { id: 'box-item-2', box_id: 'box-2', inventory_entry_id: 'entry-4', quantity: 10 }
      ],
      shipments: [{ id: 'shipment-1', drive_id: ACTIVE_DRIVE_ID, shipped_date: '2026-10-22', destination: 'Austin Area Literacy Hub', tracking_reference: 'TX-DEMO-1042', created_by: ACTOR_ID, created_at: '2026-10-22T19:00:00.000Z' }],
      changeEvents: [
        { id: 'event-1', drive_id: ACTIVE_DRIVE_ID, entity_type: 'box', entity_id: 'box-2', action: 'shipped', before_values: { status: 'ready' }, after_values: { status: 'shipped' }, actor_id: ACTOR_ID, timestamp: '2026-10-22T19:00:00.000Z' },
        { id: 'event-2', drive_id: ACTIVE_DRIVE_ID, entity_type: 'inventory_entry', entity_id: 'entry-1', action: 'classified', before_values: { decision: 'pending' }, after_values: { decision: 'accepted' }, actor_id: ACTOR_ID, timestamp: '2026-10-20T16:00:00.000Z' }
      ]
    };
  }

  function createEmptyState(baseState = createSampleState()) {
    const empty = clone(baseState);
    empty.revision = Number(baseState.revision || 0) + 1;
    empty.entries = [];
    empty.boxes = [];
    empty.boxItems = [];
    empty.shipments = [];
    empty.changeEvents = [];
    return empty;
  }

  // Domain validation component
  function validateStateEnvelope(value) {
    if (!value || typeof value !== 'object') throw new Error('Saved demo state is not an object.');
    if (value.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported schema version: ${value.schemaVersion}.`);
    const arrays = ['drives', 'locations', 'entries', 'boxes', 'boxItems', 'shipments', 'changeEvents'];
    arrays.forEach(key => { if (!Array.isArray(value[key])) throw new Error(`Saved demo state is missing ${key}.`); });
    arrays.forEach(key => {
      const ids = value[key].map(item => item?.id);
      if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new Error(`${key} contains missing or duplicate IDs.`);
    });
    if (!value.drives.some(drive => drive.id === ACTIVE_DRIVE_ID)) throw new Error('The active Texas demo drive is missing.');
    validateDomainState(value);
    return value;
  }

  function validateDomainState(candidate) {
    const driveIds = new Set(candidate.drives.map(drive => drive.id));
    const locationIds = new Set(candidate.locations.map(location => location.id));
    const entryIds = new Set(candidate.entries.map(entry => entry.id));
    const boxIds = new Set(candidate.boxes.map(box => box.id));
    const shipmentIds = new Set(candidate.shipments.map(shipment => shipment.id));
    candidate.drives.forEach(drive => { if (!drive.name || !drive.partner_name || !drive.destination_description || Number.isNaN(Date.parse(drive.created_at))) throw new Error(`Drive ${drive.id} is invalid.`); });
    const boxLabels = candidate.boxes.map(box => `${box.drive_id}:${String(box.label).toLowerCase()}`);
    if (new Set(boxLabels).size !== boxLabels.length) throw new Error('Box labels must be unique within a drive.');
    const linkedShipmentIds = candidate.boxes.filter(box => box.shipment_id).map(box => box.shipment_id);
    if (new Set(linkedShipmentIds).size !== linkedShipmentIds.length) throw new Error('A shipment cannot belong to more than one box.');
    if (candidate.locations.filter(location => location.drive_id === ACTIVE_DRIVE_ID && location.type === 'central' && location.active).length !== 1) throw new Error('The active drive must have exactly one central sorting location.');
    candidate.locations.forEach(location => { if (!driveIds.has(location.drive_id) || !location.name || !['collection', 'central'].includes(location.type) || typeof location.active !== 'boolean') throw new Error(`Location ${location.id} is invalid.`); });
    candidate.entries.forEach(entry => {
      const origin = byId(candidate.locations, entry.origin_location_id);
      const current = byId(candidate.locations, entry.current_location_id);
      if (!driveIds.has(entry.drive_id) || !locationIds.has(entry.origin_location_id) || !locationIds.has(entry.current_location_id) || origin.drive_id !== entry.drive_id || current.drive_id !== entry.drive_id || origin.type !== 'collection') throw new Error(`Inventory ${entry.id} has an invalid relationship.`);
      if (!['title', 'batch'].includes(entry.entry_mode) || (entry.entry_mode === 'title' && !String(entry.title || '').trim())) throw new Error(`Inventory ${entry.id} has an invalid entry mode or title.`);
      if (!Number.isInteger(entry.quantity) || entry.quantity < 1) throw new Error('Inventory quantities must be positive whole numbers.');
      if (!MASTER_DATA.decisions.some(item => item.value === entry.decision)) throw new Error('Inventory has an invalid decision.');
      if (!MASTER_DATA.categories.some(item => item.value === entry.category)) throw new Error('Inventory has an invalid category.');
      if (!MASTER_DATA.conditions.some(item => item.value === entry.condition)) throw new Error('Inventory has an invalid condition.');
      if (!MASTER_DATA.readingLevels.some(item => item.value === entry.reading_level)) throw new Error('Inventory has an invalid reading level.');
      if (entry.decision === 'rejected' && !String(entry.rejection_reason || '').trim()) throw new Error('Rejected inventory requires a reason.');
      if (Number.isNaN(Date.parse(entry.created_at)) || Number.isNaN(Date.parse(entry.updated_at))) throw new Error(`Inventory ${entry.id} has invalid dates.`);
    });
    candidate.boxes.forEach(box => {
      const total = candidate.boxItems.filter(item => item.box_id === box.id).reduce((sum, item) => sum + item.quantity, 0);
      if (!driveIds.has(box.drive_id) || !['open', 'ready', 'shipped'].includes(box.status)) throw new Error(`Box ${box.id} is invalid.`);
      if (['ready', 'shipped'].includes(box.status) && (!total || box.verified_quantity !== total)) throw new Error('A ready or shipped box requires a matching physical count.');
      if (box.status === 'shipped' && (!box.shipment_id || !shipmentIds.has(box.shipment_id))) throw new Error('A shipped box requires a shipment.');
      if (box.status !== 'shipped' && box.shipment_id) throw new Error('Only a shipped box may reference a shipment.');
    });
    candidate.shipments.forEach(shipment => {
      if (!driveIds.has(shipment.drive_id) || !/^\d{4}-\d{2}-\d{2}$/.test(shipment.shipped_date) || shipment.shipped_date > localDateString() || !shipment.destination || Number.isNaN(Date.parse(shipment.created_at))) throw new Error('A shipment is invalid or future-dated.');
    });
    candidate.boxItems.forEach(item => {
      const box = byId(candidate.boxes, item.box_id);
      const entry = byId(candidate.entries, item.inventory_entry_id);
      if (!boxIds.has(item.box_id) || !entryIds.has(item.inventory_entry_id) || box.drive_id !== entry.drive_id || !Number.isInteger(item.quantity) || item.quantity < 1) throw new Error('A box allocation is invalid.');
      if (entry.decision !== 'accepted' || byId(candidate.locations, entry.current_location_id)?.type !== 'central') throw new Error('Only accepted inventory at central sorting may be packed.');
    });
    candidate.entries.forEach(entry => {
      const allocated = candidate.boxItems.filter(item => item.inventory_entry_id === entry.id).reduce((sum, item) => sum + item.quantity, 0);
      if (allocated > entry.quantity) throw new Error(`Inventory ${entry.id} is overallocated.`);
      if (allocated && entry.decision !== 'accepted') throw new Error('Only accepted inventory may remain packed.');
    });
    candidate.boxes.filter(box => box.shipment_id).forEach(box => { if (byId(candidate.shipments, box.shipment_id)?.drive_id !== box.drive_id) throw new Error('A box references a shipment from another drive.'); });
    candidate.changeEvents.forEach(event => { if (!driveIds.has(event.drive_id) || !event.entity_type || !event.action || Number.isNaN(Date.parse(event.timestamp))) throw new Error(`Change event ${event.id} is invalid.`); });
    return candidate;
  }

  // Async persistence component. A future database adapter can implement this contract.
  function createRepository(key) {
    let mode = 'browser';
    let memoryState = null;
    let recoveryRaw = null;
    return {
      get mode() { return mode; },
      get recoveryContent() { return recoveryRaw; },
      async load() {
        let raw = null;
        try {
          raw = localStorage.getItem(key);
          if (raw === null) {
            const seeded = createSampleState();
            localStorage.setItem(key, JSON.stringify(seeded));
            return clone(seeded);
          }
          return clone(validateStateEnvelope(JSON.parse(raw)));
        } catch (error) {
          recoveryRaw = raw;
          mode = 'memory';
          memoryState = memoryState || createSampleState();
          throw Object.assign(new Error('Browser storage could not be loaded. Temporary-memory mode is active.'), { cause: error, fallbackState: clone(memoryState) });
        }
      },
      async save(nextState) {
        const candidate = clone(validateStateEnvelope(nextState));
        if (mode === 'memory') {
          memoryState = candidate;
          return clone(candidate);
        }
        try {
          localStorage.setItem(key, JSON.stringify(candidate));
          return clone(candidate);
        } catch (error) {
          mode = 'memory';
          memoryState = candidate;
          throw Object.assign(new Error('Browser storage rejected the save. Changes remain available only until this tab closes.'), { cause: error, fallbackState: clone(candidate) });
        }
      },
      async replace(nextState) {
        const candidate = clone(validateStateEnvelope(nextState));
        try {
          localStorage.setItem(key, JSON.stringify(candidate));
          mode = 'browser'; memoryState = null; recoveryRaw = null;
          return clone(candidate);
        } catch (error) {
          mode = 'memory'; memoryState = candidate;
          throw Object.assign(new Error('Browser storage rejected the replacement. The imported state is temporary.'), { cause: error, fallbackState: clone(candidate) });
        }
      }
    };
  }

  // Application state and DOM component registry
  const repository = createRepository(STORAGE_KEY);
  let state = createSampleState();
  let staleTab = false;

  const elements = {
    banner: document.querySelector('#storage-banner'),
    storageDot: document.querySelector('#storage-dot'),
    storageMessage: document.querySelector('#storage-message'),
    appError: document.querySelector('#app-error'),
    toast: document.querySelector('#toast'),
    topbarDriveName: document.querySelector('#topbar-drive-name'),
    metricCards: document.querySelector('#metric-cards'),
    goalLabel: document.querySelector('#goal-label'),
    goalPercent: document.querySelector('#goal-percent'),
    goalBar: document.querySelector('#goal-bar'),
    locationSummary: document.querySelector('#location-summary'),
    activityList: document.querySelector('#activity-list'),
    inventoryTable: document.querySelector('#inventory-table'),
    boxGrid: document.querySelector('#box-grid'),
    boxModal: document.querySelector('#box-modal'),
    boxModalBody: document.querySelector('#box-modal-body'),
    boxModalTitle: document.querySelector('#box-modal-title'),
    boxModalEyebrow: document.querySelector('#box-modal-eyebrow'),
    driveForm: document.querySelector('#drive-form'),
    saveDrive: document.querySelector('#save-drive'),
    receiveForm: document.querySelector('#receive-form'),
    receiveSave: document.querySelector('#receive-save'),
    receiveTitleField: document.querySelector('#receive-title-field'),
    receiveRejectionField: document.querySelector('#receive-rejection-field'),
    setupLocationList: document.querySelector('#setup-location-list'),
    locationForm: document.querySelector('#location-form'),
    inventoryModal: document.querySelector('#inventory-modal'),
    inventoryModalBody: document.querySelector('#inventory-modal-body'),
    inventoryModalTitle: document.querySelector('#inventory-modal-title'),
    importFile: document.querySelector('#import-json-file'),
    importInventoryCsvFile: document.querySelector('#import-inventory-csv-file'),
    downloadRecovery: document.querySelector('#download-recovery')
  };

  // Domain queries and derived metrics
  function activeDrive() { return byId(state.drives, ACTIVE_DRIVE_ID); }
  function locationName(id) { return byId(state.locations, id)?.name || 'Unknown location'; }
  function allocationsForEntry(id) { return state.boxItems.filter(item => item.inventory_entry_id === id); }
  function boxQuantity(id) { return state.boxItems.filter(item => item.box_id === id).reduce((sum, item) => sum + item.quantity, 0); }

  function calculateMetrics(source = state) {
    const entries = source.entries.filter(entry => entry.drive_id === ACTIVE_DRIVE_ID);
    const packed = source.boxItems.reduce((sum, item) => sum + item.quantity, 0);
    const shippedBoxIds = new Set(source.boxes.filter(box => box.status === 'shipped').map(box => box.id));
    const shipped = source.boxItems.filter(item => shippedBoxIds.has(item.box_id)).reduce((sum, item) => sum + item.quantity, 0);
    return {
      received: entries.reduce((sum, entry) => sum + entry.quantity, 0),
      pending: entries.filter(entry => entry.decision === 'pending').reduce((sum, entry) => sum + entry.quantity, 0),
      accepted: entries.filter(entry => entry.decision === 'accepted').reduce((sum, entry) => sum + entry.quantity, 0),
      rejected: entries.filter(entry => entry.decision === 'rejected').reduce((sum, entry) => sum + entry.quantity, 0),
      packed,
      shipped
    };
  }

  function downloadFile(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
    URL.revokeObjectURL(url);
  }

  function safeCsvCell(value) {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }

  function csvDocument(rows) {
    return `\ufeff${rows.map(row => row.map(safeCsvCell).join(',')).join('\r\n')}`;
  }

  function downloadInventoryTemplate() {
    downloadFile('donar-inventory-import-template.csv', csvDocument([INVENTORY_IMPORT_HEADERS]), 'text/csv;charset=utf-8');
  }

  function parseCsv(text) {
    const rows = []; let row = [], cell = '', quoted = false;
    const source = String(text).replace(/^\ufeff/, '');
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (quoted) {
        if (character === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
        else if (character === '"') quoted = false;
        else cell += character;
      } else if (character === '"' && cell === '') quoted = true;
      else if (character === ',') { row.push(cell); cell = ''; }
      else if (character === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (character !== '\r') cell += character;
    }
    if (quoted) throw new Error('CSV contains an unclosed quoted field.');
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(values => values.some(value => String(value).trim() !== ''));
  }

  function resolveMasterValue(items, rawValue, field, rowNumber) {
    const normalized = String(rawValue || '').trim().toLowerCase();
    const match = items.find(item => item.value.toLowerCase() === normalized || item.label.toLowerCase() === normalized);
    if (!match) throw new Error(`Row ${rowNumber}: invalid ${field} "${rawValue}".`);
    return match.value;
  }

  function resolveCsvLocation(rawValue, rowNumber, originOnly = false) {
    const normalized = String(rawValue || '').trim().toLowerCase();
    const location = state.locations.find(item => item.drive_id === ACTIVE_DRIVE_ID && item.active && (item.id.toLowerCase() === normalized || item.name.toLowerCase() === normalized));
    if (!location || (originOnly && location.type !== 'collection')) throw new Error(`Row ${rowNumber}: invalid ${originOnly ? 'origin' : 'current'} location "${rawValue}".`);
    return location;
  }

  function parseInventoryImport(text) {
    const rows = parseCsv(text);
    if (!rows.length) throw new Error('CSV is empty.');
    const headers = rows[0].map(value => value.trim().toLowerCase());
    if (headers.length !== INVENTORY_IMPORT_HEADERS.length || headers.some((header, index) => header !== INVENTORY_IMPORT_HEADERS[index])) throw new Error(`CSV headers must be exactly: ${INVENTORY_IMPORT_HEADERS.join(', ')}.`);
    if (rows.length === 1) throw new Error('CSV has headers but no inventory rows.');
    return rows.slice(1).map((values, index) => {
      const rowNumber = index + 2;
      if (values.length > headers.length) throw new Error(`Row ${rowNumber}: too many columns.`);
      const record = Object.fromEntries(headers.map((header, column) => [header, String(values[column] ?? '').trim()]));
      const mode = record.entry_mode.toLowerCase();
      if (!['title', 'batch'].includes(mode)) throw new Error(`Row ${rowNumber}: entry_mode must be title or batch.`);
      if (mode === 'title' && !record.title) throw new Error(`Row ${rowNumber}: title is required in title mode.`);
      const quantity = Number(record.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) throw new Error(`Row ${rowNumber}: quantity must be a positive whole number.`);
      const origin = resolveCsvLocation(record.origin_location, rowNumber, true);
      const current = record.current_location ? resolveCsvLocation(record.current_location, rowNumber) : origin;
      const decision = resolveMasterValue(MASTER_DATA.decisions, record.decision, 'decision', rowNumber);
      if (decision === 'rejected' && !record.rejection_reason) throw new Error(`Row ${rowNumber}: rejection_reason is required for rejected books.`);
      const timestamp = nowIso();
      return {
        id: uid('entry'), drive_id: ACTIVE_DRIVE_ID, origin_location_id: origin.id, current_location_id: current.id,
        entry_mode: mode, title: mode === 'title' ? record.title : '', category: resolveMasterValue(MASTER_DATA.categories, record.category, 'category', rowNumber), quantity,
        condition: resolveMasterValue(MASTER_DATA.conditions, record.condition, 'condition', rowNumber), reading_level: resolveMasterValue(MASTER_DATA.readingLevels, record.reading_level, 'reading_level', rowNumber), decision,
        rejection_reason: decision === 'rejected' ? record.rejection_reason : '', parent_entry_id: null, notes: record.notes,
        version: 1, created_by: ACTOR_ID, created_at: timestamp, updated_at: timestamp
      };
    });
  }

  function openInventoryCsvPreview(entries) {
    const books = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const possibleDuplicates = entries.filter(entry => entry.entry_mode === 'title' && state.entries.some(existing => existing.entry_mode === 'title' && existing.origin_location_id === entry.origin_location_id && existing.title.trim().toLowerCase() === entry.title.trim().toLowerCase())).length;
    showBoxModal('Append inventory CSV?', 'Validated CSV preview', `<div class="notice">This appends new, unpacked inventory to the current drive. Existing rows are not replaced.</div><div class="location-admin-row"><span>Rows to add</span><strong>${entries.length}</strong></div><div class="location-admin-row"><span>Physical books</span><strong>${books}</strong></div><div class="location-admin-row"><span>Possible repeated titles</span><strong>${possibleDuplicates}</strong></div><div class="form-actions"><button class="button" type="button" id="cancel-csv-import">Cancel</button><button class="button primary" type="button" id="confirm-csv-import">Append inventory</button></div>`);
    document.querySelector('#cancel-csv-import').addEventListener('click', closeBoxModal);
    document.querySelector('#confirm-csv-import').addEventListener('click', async event => {
      event.target.disabled = true;
      const candidate = clone(state); candidate.entries.push(...clone(entries)); candidate.revision += 1;
      candidate.changeEvents.push({ id: uid('event'), drive_id: ACTIVE_DRIVE_ID, entity_type: 'inventory_import', entity_id: ACTIVE_DRIVE_ID, action: 'csv_imported', before_values: null, after_values: { rows: entries.length, books }, actor_id: ACTOR_ID, timestamp: nowIso() });
      if (await commitCandidate(candidate, `${entries.length} inventory rows imported.`)) { closeBoxModal(); switchView('inventory'); }
    });
  }

  function exportInventoryCsv() {
    const rows = [['Entry ID','Origin','Current location','Title','Category','Condition','Reading level','Decision','Rejection reason','Received quantity','Packed quantity','Shipped quantity','Box labels']];
    state.entries.forEach(entry => {
      const allocations = allocationsForEntry(entry.id), shippedAllocations = allocations.filter(item => byId(state.boxes, item.box_id)?.status === 'shipped');
      rows.push([entry.id, locationName(entry.origin_location_id), locationName(entry.current_location_id), entry.title, entry.category, entry.condition, entry.reading_level, entry.decision, entry.rejection_reason, entry.quantity, allocations.reduce((n,item)=>n+item.quantity,0), shippedAllocations.reduce((n,item)=>n+item.quantity,0), allocations.map(item => byId(state.boxes,item.box_id)?.label).filter(Boolean).join(' | ')]);
    });
    downloadFile('donar-inventory.csv', csvDocument(rows), 'text/csv;charset=utf-8');
  }

  function exportAllocationsCsv() {
    const rows = [['Allocation ID','Box label','Entry ID','Title or category','Allocated quantity','Box status']];
    state.boxItems.forEach(item => { const box=byId(state.boxes,item.box_id), entry=byId(state.entries,item.inventory_entry_id); rows.push([item.id,box?.label,entry?.id,entry?.title||entry?.category,item.quantity,box?.status]); });
    downloadFile('donar-box-allocations.csv', csvDocument(rows), 'text/csv;charset=utf-8');
  }

  function exportJson() {
    downloadFile('donar-full-backup.json', JSON.stringify({ ...clone(state), exportedAt: nowIso() }, null, 2), 'application/json');
  }

  function runAcceptanceChecks(candidate = state) {
    validateStateEnvelope(clone(candidate));
    const metrics = calculateMetrics(candidate);
    const checks = [
      ['Received reconciles with decisions', metrics.received === metrics.pending + metrics.accepted + metrics.rejected],
      ['Shipped ≤ packed', metrics.shipped <= metrics.packed],
      ['Packed ≤ accepted', metrics.packed <= metrics.accepted],
      ['Accepted ≤ received', metrics.accepted <= metrics.received],
      ['JSON round trip parses', Boolean(JSON.parse(JSON.stringify(candidate)))],
      ['One active central sorting location', candidate.locations.filter(location => location.drive_id === ACTIVE_DRIVE_ID && location.type === 'central' && location.active).length === 1],
      ['CSV formula prefixes are neutralized', safeCsvCell('=SUM(A1:A2)').startsWith('"\'')],
      ['HTML-like text is escaped', escapeHtml('<script>') === '&lt;script&gt;']
    ];
    if (checks.some(([,passed]) => !passed)) throw new Error('One or more acceptance checks failed.');
    return checks;
  }

  function formatAction(event) {
    const labels = { csv_imported: 'Inventory CSV imported', shipped: 'Box marked shipped', shipment_reversed: 'Shipment reversed', box_created: 'New box created', packed: 'Books packed', unpacked: 'Books unpacked', box_ready: 'Box verified and ready', classified: 'The Wild Robot marked accepted', setup_updated: 'Drive setup updated', received: 'New books received', updated: 'Inventory updated', split_and_updated: 'Inventory split and updated', location_created: 'Collection location added' };
    return labels[event.action] || `${event.entity_type} ${event.action.replaceAll('_', ' ')}`;
  }

  // View-rendering components
  function renderStorageStatus() {
    const temporary = repository.mode === 'memory';
    elements.storageDot.classList.toggle('warning', temporary || staleTab);
    elements.storageMessage.textContent = staleTab ? 'Another tab changed this demo — reload before editing' : temporary
      ? 'Demo — temporary-memory mode; changes disappear when this tab closes'
      : 'Demo — fictional data stored only in this browser';
  }

  function renderDashboard() {
    const metrics = calculateMetrics();
    elements.metricCards.innerHTML = Object.entries(metrics).map(([label, value]) => `<article class="stat"><span>${label[0].toUpperCase() + label.slice(1)}</span><strong>${value}</strong></article>`).join('');
    const drive = activeDrive();
    const goal = drive.goal_accepted_quantity;
    const percent = goal ? Math.round((metrics.accepted / goal) * 100) : 0;
    elements.goalLabel.textContent = goal ? `${metrics.accepted} / ${goal}` : 'No goal set';
    elements.goalPercent.textContent = goal ? `${percent}%` : '';
    elements.goalBar.style.width = `${Math.min(100, percent)}%`;
    elements.locationSummary.innerHTML = state.locations.filter(location => location.type === 'collection').map(location => {
      const total = state.entries.filter(entry => entry.origin_location_id === location.id).reduce((sum, entry) => sum + entry.quantity, 0);
      return `<div class="location-row"><div><strong>${escapeHtml(location.name)}</strong><small>Collection location</small></div><strong>${total}</strong></div>`;
    }).join('');
    elements.activityList.innerHTML = [...state.changeEvents].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5).map(event => `<div class="activity-row"><p>${formatAction(event)}</p><time datetime="${event.timestamp}">${new Date(event.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time></div>`).join('');
  }

  function renderInventory() {
    const search = document.querySelector('#inventory-search').value.trim().toLowerCase();
    const origin = document.querySelector('#filter-origin').value;
    const current = document.querySelector('#filter-current').value;
    const reading = document.querySelector('#filter-reading').value;
    const decision = document.querySelector('#filter-decision').value;
    const packing = document.querySelector('#filter-packing').value;
    const rows = state.entries.filter(entry => {
      const allocated = allocationsForEntry(entry.id).reduce((sum, item) => sum + item.quantity, 0);
      const packingState = allocated === 0 ? 'unpacked' : allocated === entry.quantity ? 'packed' : 'partial';
      const label = `${entry.title} ${entry.category}`.toLowerCase();
      return (!search || label.includes(search)) && (!origin || entry.origin_location_id === origin) && (!current || entry.current_location_id === current) && (!reading || entry.reading_level === reading) && (!decision || entry.decision === decision) && (!packing || packingState === packing);
    });
    elements.inventoryTable.innerHTML = rows.length ? rows.map(entry => {
      const allocated = allocationsForEntry(entry.id).reduce((sum, item) => sum + item.quantity, 0);
      return `<tr><td><strong>${escapeHtml(entry.title || `${entry.category} batch`)}</strong><small>${escapeHtml(entry.reading_level)} · ${escapeHtml(entry.condition)}${entry.parent_entry_id ? ' · split row' : ''}</small></td><td>${escapeHtml(locationName(entry.origin_location_id))}</td><td>${escapeHtml(locationName(entry.current_location_id))}</td><td>${entry.quantity}<small>${allocated ? `${allocated} packed` : ''}</small></td><td><span class="badge ${entry.decision}">${entry.decision}</span>${entry.rejection_reason ? `<small>${escapeHtml(entry.rejection_reason)}</small>` : ''}</td><td><button class="button small" type="button" data-manage-entry="${entry.id}">Manage</button></td></tr>`;
    }).join('') : '<tr><td colspan="6" class="muted" style="padding:32px;text-align:center">No inventory matches these filters.</td></tr>';
  }

  function renderBoxes() {
    elements.boxGrid.innerHTML = state.boxes.length ? state.boxes.map(box => `<article class="card"><div style="display:flex;justify-content:space-between;gap:12px"><strong>${escapeHtml(box.label)}</strong><span class="badge ${box.status}">${box.status}</span></div><div class="box-total">${boxQuantity(box.id)}</div><div class="muted">books allocated${box.verified_quantity !== null ? ` · verified ${box.verified_quantity}` : ''}</div><div class="box-actions"><button class="button small" type="button" data-manage-box="${box.id}">Manage</button><button class="button small" type="button" data-box-manifest="${box.id}" ${boxQuantity(box.id) ? '' : 'disabled'}>Manifest</button></div></article>`).join('') : '<div class="card muted">No boxes yet. Create one to begin packing.</div>';
  }

  function renderSetup() {
    const drive = activeDrive();
    elements.driveForm.elements.name.value = drive.name;
    elements.driveForm.elements.partner_name.value = drive.partner_name;
    elements.driveForm.elements.goal_accepted_quantity.value = drive.goal_accepted_quantity ?? '';
    elements.driveForm.elements.destination_description.value = drive.destination_description;
    elements.driveForm.elements.guidance_text.value = drive.guidance_text;
    elements.setupLocationList.innerHTML = state.locations.filter(location => location.drive_id === ACTIVE_DRIVE_ID && location.active).map(location => `<div class="location-admin-row"><div><strong>${escapeHtml(location.name)}</strong><div class="muted">${location.type === 'central' ? 'Central sorting location' : 'Collection location'}</div></div><span class="badge ${location.type === 'central' ? 'accepted' : 'pending'}">${location.type}</span></div>`).join('');
      elements.downloadRecovery.hidden = !repository.recoveryContent;
  }

  function replaceOptions(select, items, placeholder) {
    const selected = select.value;
    select.innerHTML = `${placeholder ? `<option value="">${placeholder}</option>` : ''}${items.map(item => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join('')}`;
    if ([...select.options].some(option => option.value === selected)) select.value = selected;
  }

  function renderSelectOptions() {
    const activeLocations = state.locations.filter(location => location.drive_id === ACTIVE_DRIVE_ID && location.active).map(location => ({ value: location.id, label: location.name }));
    const collectionLocations = state.locations.filter(location => location.drive_id === ACTIVE_DRIVE_ID && location.active && location.type === 'collection').map(location => ({ value: location.id, label: location.name }));
    replaceOptions(document.querySelector('#filter-origin'), collectionLocations, 'All origins');
    replaceOptions(document.querySelector('#filter-current'), activeLocations, 'All current locations');
    replaceOptions(document.querySelector('#filter-reading'), MASTER_DATA.readingLevels, 'All reading levels');
    replaceOptions(document.querySelector('#receive-origin'), collectionLocations, 'Select an origin');
    replaceOptions(document.querySelector('#receive-category'), MASTER_DATA.categories, '');
    replaceOptions(document.querySelector('#receive-condition'), MASTER_DATA.conditions, '');
    replaceOptions(document.querySelector('#receive-reading'), MASTER_DATA.readingLevels, '');
    replaceOptions(document.querySelector('#receive-decision'), MASTER_DATA.decisions, '');
  }

  function render() {
    const drive = activeDrive();
    elements.topbarDriveName.textContent = drive.name;
    renderStorageStatus();
    renderSelectOptions();
    renderDashboard();
    renderInventory();
    renderBoxes();
    renderSetup();
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('visible');
    window.setTimeout(() => elements.toast.classList.remove('visible'), 2600);
  }

  function showError(message) {
    elements.appError.textContent = message;
    elements.appError.hidden = false;
    showToast(message);
  }

  // Navigation and interaction controllers
  function switchView(name) {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === `${name}-view`));
    document.querySelectorAll('.nav-button').forEach(button => button.setAttribute('aria-current', button.dataset.view === name ? 'page' : 'false'));
    document.querySelector(`#${name}-view h1`)?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function commitCandidate(candidate, successMessage) {
    if (staleTab) { showError('This tab is stale because another tab changed the data. Reload before editing.'); return false; }
    elements.appError.hidden = true;
    try {
      validateDomainState(candidate);
      state = await repository.save(candidate);
      render();
      if (successMessage) showToast(successMessage);
      return true;
    } catch (error) {
      if (error.fallbackState) state = error.fallbackState;
      renderStorageStatus();
      showError(error.message);
      return false;
    }
  }

  function setReceiveMode(mode) {
    document.querySelectorAll('[data-entry-mode]').forEach(button => button.classList.toggle('active', button.dataset.entryMode === mode));
    elements.receiveForm.dataset.entryMode = mode;
    elements.receiveTitleField.hidden = mode !== 'title';
  }

  function closeInventoryModal() {
    elements.inventoryModal.hidden = true;
    elements.inventoryModalBody.innerHTML = '';
  }

  function closeBoxModal() {
    elements.boxModal.hidden = true;
    elements.boxModalBody.innerHTML = '';
    document.body.classList.remove('printing-manifest');
  }

  function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function availableQuantity(entryId, candidate = state) {
    const entry = byId(candidate.entries, entryId);
    if (!entry) return 0;
    const allocated = candidate.boxItems.filter(item => item.inventory_entry_id === entryId).reduce((sum, item) => sum + item.quantity, 0);
    return entry.quantity - allocated;
  }

  function showBoxModal(title, eyebrow, html) {
    elements.boxModalTitle.textContent = title;
    elements.boxModalEyebrow.textContent = eyebrow;
    elements.boxModalBody.innerHTML = html;
    elements.boxModal.hidden = false;
  }

  function openCreateBox() {
    const nextNumber = String(state.boxes.length + 1).padStart(3, '0');
    showBoxModal('Create a box', 'Packing', `<form id="create-box-form" novalidate><div class="field"><label for="box-label">Box label</label><input id="box-label" name="label" maxlength="80" value="BOX-${nextNumber}" required></div><div class="form-actions"><button class="button" type="button" data-close-box>Cancel</button><button class="button primary" type="submit">Create box</button></div></form>`);
    const form = document.querySelector('#create-box-form');
    document.querySelector('[data-close-box]').addEventListener('click', closeBoxModal);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const label = String(new FormData(form).get('label') || '').trim();
      if (!label) { showError('Enter a box label.'); return; }
      if (state.boxes.some(box => box.drive_id === ACTIVE_DRIVE_ID && box.label.toLowerCase() === label.toLowerCase())) { showError('This box label already exists.'); return; }
      const candidate = clone(state);
      const box = { id: uid('box'), drive_id: ACTIVE_DRIVE_ID, label, status: 'open', verified_quantity: null, shipment_id: null, version: 1 };
      candidate.boxes.push(box); candidate.revision += 1;
      candidate.changeEvents.push({ id: uid('event'), drive_id: ACTIVE_DRIVE_ID, entity_type: 'box', entity_id: box.id, action: 'box_created', before_values: null, after_values: clone(box), actor_id: ACTOR_ID, timestamp: nowIso() });
      form.querySelector('button[type="submit"]').disabled = true;
      const saved = await commitCandidate(candidate, `${label} created.`);
      if (saved) { closeBoxModal(); openBoxManager(box.id); }
    });
  }

  function openBoxManager(boxId) {
    const box = byId(state.boxes, boxId);
    if (!box) return;
    const items = state.boxItems.filter(item => item.box_id === boxId);
    const total = boxQuantity(boxId);
    const central = state.locations.find(location => location.drive_id === box.drive_id && location.type === 'central' && location.active);
    const available = state.entries.filter(entry => entry.drive_id === box.drive_id && entry.decision === 'accepted' && entry.current_location_id === central?.id && availableQuantity(entry.id) > 0);
    const rows = items.length ? items.map(item => { const entry = byId(state.entries, item.inventory_entry_id); return `<div class="allocation-row"><div><strong>${escapeHtml(entry.title || `${entry.category} batch`)}</strong><div class="muted">${escapeHtml(entry.reading_level)} · ${escapeHtml(entry.condition)}</div></div><strong>${item.quantity}</strong>${box.status === 'shipped' ? '<span class="muted">Locked</span>' : `<button class="button small" type="button" data-unpack-item="${item.id}">Unpack</button>`}</div>`; }).join('') : '<div class="allocation-row muted">No books packed yet.</div>';
    const availableOptions = available.map(entry => `<option value="${entry.id}">${escapeHtml(entry.title || `${entry.category} batch`)} — ${availableQuantity(entry.id)} available</option>`).join('');
    showBoxModal(box.label, 'Pack & reconcile', `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><span class="badge ${box.status}">${box.status}</span><div class="box-total">${total}</div><div class="muted">books in manifest</div></div>${box.verified_quantity !== null ? `<strong>Verified: ${box.verified_quantity}</strong>` : ''}</div><div class="allocation-list">${rows}</div>${box.status !== 'shipped' ? `<form id="pack-form" class="form-grid" novalidate><div class="field"><label for="pack-entry">Available accepted inventory</label><select id="pack-entry" name="entry_id"><option value="">Select inventory</option>${availableOptions}</select></div><div class="field"><label for="pack-quantity">Quantity</label><input id="pack-quantity" name="quantity" type="number" min="1" step="1" value="1"></div><div class="field full"><button class="button" type="submit" ${available.length ? '' : 'disabled'}>Add to box</button></div></form><form id="verify-form" style="margin-top:18px" novalidate><div class="field"><label for="verified-count">Physical verified count</label><input id="verified-count" name="verified_quantity" type="number" min="0" step="1" value="${box.verified_quantity ?? ''}" placeholder="Must equal ${total}"></div><div class="form-actions"><button class="button" type="button" data-box-manifest-inline>Manifest</button>${box.status === 'ready' ? '<button class="button primary" type="button" id="ship-ready-box">Record shipment</button>' : `<button class="button primary" type="submit" ${total ? '' : 'disabled'}>Mark ready</button>`}</div></form>` : `<div class="notice">Shipped contents are locked. Reverse the shipment with a reason before correcting this box.</div><div class="form-actions no-print"><button class="button" type="button" data-box-manifest-inline>Manifest</button><button class="button primary" type="button" id="reverse-shipment">Reverse shipment</button></div>`}`);

    elements.boxModalBody.querySelectorAll('[data-unpack-item]').forEach(button => button.addEventListener('click', async () => {
      const candidate = clone(state), item = byId(candidate.boxItems, button.dataset.unpackItem), targetBox = byId(candidate.boxes, boxId);
      if (!item || targetBox.status === 'shipped') return;
      candidate.boxItems = candidate.boxItems.filter(value => value.id !== item.id); targetBox.status = 'open'; targetBox.verified_quantity = null; targetBox.version += 1; candidate.revision += 1;
      candidate.changeEvents.push({ id: uid('event'), drive_id: targetBox.drive_id, entity_type: 'box_item', entity_id: item.id, action: 'unpacked', before_values: clone(item), after_values: null, actor_id: ACTOR_ID, timestamp: nowIso() });
      if (await commitCandidate(candidate, 'Books unpacked.')) openBoxManager(boxId);
    }));
    document.querySelector('[data-box-manifest-inline]')?.addEventListener('click', () => openManifest(boxId));
    const packForm = document.querySelector('#pack-form');
    packForm?.addEventListener('submit', async event => {
      event.preventDefault(); const data = new FormData(packForm), entryId = String(data.get('entry_id')), quantity = Number(data.get('quantity'));
      if (!entryId || !Number.isInteger(quantity) || quantity < 1 || quantity > availableQuantity(entryId)) { showError('Select inventory and enter an available whole quantity.'); return; }
      const candidate = clone(state), targetBox = byId(candidate.boxes, boxId);
      candidate.boxItems.push({ id: uid('box-item'), box_id: boxId, inventory_entry_id: entryId, quantity }); targetBox.status = 'open'; targetBox.verified_quantity = null; targetBox.version += 1; candidate.revision += 1;
      candidate.changeEvents.push({ id: uid('event'), drive_id: targetBox.drive_id, entity_type: 'box', entity_id: boxId, action: 'packed', before_values: null, after_values: { inventory_entry_id: entryId, quantity }, actor_id: ACTOR_ID, timestamp: nowIso() });
      packForm.querySelector('button[type="submit"]').disabled = true;
      if (await commitCandidate(candidate, `${quantity} books packed.`)) openBoxManager(boxId);
    });
    const verifyForm = document.querySelector('#verify-form');
    verifyForm?.addEventListener('submit', async event => {
      event.preventDefault(); const verified = Number(new FormData(verifyForm).get('verified_quantity'));
      if (!total || !Number.isInteger(verified) || verified !== total) { showError(`Verified count must equal the manifest total of ${total}.`); return; }
      const candidate = clone(state), targetBox = byId(candidate.boxes, boxId), before = clone(targetBox);
      targetBox.status = 'ready'; targetBox.verified_quantity = verified; targetBox.version += 1; candidate.revision += 1;
      candidate.changeEvents.push({ id: uid('event'), drive_id: targetBox.drive_id, entity_type: 'box', entity_id: boxId, action: 'box_ready', before_values: before, after_values: clone(targetBox), actor_id: ACTOR_ID, timestamp: nowIso() });
      verifyForm.querySelector('button[type="submit"]').disabled = true;
      if (await commitCandidate(candidate, `${targetBox.label} is ready.`)) openBoxManager(boxId);
    });
    document.querySelector('#ship-ready-box')?.addEventListener('click', () => openShipmentForm(boxId));
    document.querySelector('#reverse-shipment')?.addEventListener('click', () => openReversalForm(boxId));
  }

  function openShipmentForm(boxId) {
    const box = byId(state.boxes, boxId), drive = activeDrive(), today = localDateString();
    if (!box || box.status !== 'ready') return;
    showBoxModal(`Ship ${box.label}`, 'Simulated handoff', `<div class="notice">Confirming shipment locks this box's contents.</div><form id="shipment-form" novalidate><div class="form-grid"><div class="field"><label for="shipped-date">Shipment date</label><input id="shipped-date" name="shipped_date" type="date" max="${today}" value="${today}" required></div><div class="field"><label for="tracking-reference">Tracking reference <span class="muted">(optional)</span></label><input id="tracking-reference" name="tracking_reference" maxlength="120"></div><div class="field full"><label for="shipment-destination">Destination</label><input id="shipment-destination" name="destination" maxlength="180" value="${escapeHtml(drive.destination_description)}" required></div></div><div class="form-actions"><button class="button" type="button" id="cancel-shipment">Cancel</button><button class="button primary" type="submit">Confirm handoff</button></div></form>`);
    document.querySelector('#cancel-shipment').addEventListener('click', () => openBoxManager(boxId));
    const form = document.querySelector('#shipment-form');
    form.addEventListener('submit', async event => {
      event.preventDefault(); const data = new FormData(form), date = String(data.get('shipped_date')), destination = String(data.get('destination') || '').trim();
      if (!date || date > today || !destination) { showError('Enter a destination and a nonfuture shipment date.'); return; }
      const candidate = clone(state), targetBox = byId(candidate.boxes, boxId), before = clone(targetBox);
      if (targetBox.status !== 'ready' || targetBox.verified_quantity !== boxQuantity(boxId)) { showError('Only a verified ready box can ship.'); return; }
      const shipment = { id: uid('shipment'), drive_id: targetBox.drive_id, shipped_date: date, destination, tracking_reference: String(data.get('tracking_reference') || '').trim(), created_by: ACTOR_ID, created_at: nowIso() };
      candidate.shipments.push(shipment); targetBox.status = 'shipped'; targetBox.shipment_id = shipment.id; targetBox.version += 1; candidate.revision += 1;
      candidate.changeEvents.push({ id: uid('event'), drive_id: targetBox.drive_id, entity_type: 'box', entity_id: boxId, action: 'shipped', before_values: before, after_values: clone(targetBox), actor_id: ACTOR_ID, timestamp: nowIso() });
      form.querySelector('button[type="submit"]').disabled = true;
      if (await commitCandidate(candidate, `${targetBox.label} marked shipped.`)) openBoxManager(boxId);
    });
  }

  function openReversalForm(boxId) {
    const box = byId(state.boxes, boxId);
    if (!box || box.status !== 'shipped') return;
    showBoxModal(`Reverse ${box.label}`, 'Shipment correction', `<div class="notice error-panel">This reopens the shipped box for correction. The original shipment remains in local history.</div><form id="reversal-form" novalidate><div class="field"><label for="reversal-reason">Reason for reversal</label><textarea id="reversal-reason" name="reason" maxlength="500" required></textarea></div><div class="form-actions"><button class="button" type="button" id="cancel-reversal">Cancel</button><button class="button primary" type="submit">Reverse shipment</button></div></form>`);
    document.querySelector('#cancel-reversal').addEventListener('click', () => openBoxManager(boxId));
    const form = document.querySelector('#reversal-form');
    form.addEventListener('submit', async event => {
      event.preventDefault(); const reason = String(new FormData(form).get('reason') || '').trim();
      if (!reason) { showError('A reversal reason is required.'); return; }
      const candidate = clone(state), targetBox = byId(candidate.boxes, boxId), shipment = byId(candidate.shipments, targetBox.shipment_id), before = clone(targetBox);
      shipment.reversed_at = nowIso(); shipment.reversal_reason = reason; targetBox.status = 'ready'; targetBox.shipment_id = null; targetBox.version += 1; candidate.revision += 1;
      candidate.changeEvents.push({ id: uid('event'), drive_id: targetBox.drive_id, entity_type: 'box', entity_id: boxId, action: 'shipment_reversed', before_values: before, after_values: { ...clone(targetBox), reason }, actor_id: ACTOR_ID, timestamp: nowIso() });
      form.querySelector('button[type="submit"]').disabled = true;
      if (await commitCandidate(candidate, 'Shipment reversed and box unlocked.')) openBoxManager(boxId);
    });
  }

  function openManifest(boxId) {
    const box = byId(state.boxes, boxId), drive = activeDrive(), items = state.boxItems.filter(item => item.box_id === boxId), shipment = byId(state.shipments, box.shipment_id), total = boxQuantity(boxId);
    if (!box || !items.length) return;
    const rows = items.map(item => { const entry = byId(state.entries, item.inventory_entry_id); return `<tr><td>${escapeHtml(entry.title || `${entry.category} batch`)}</td><td>${escapeHtml(entry.reading_level)}</td><td>${escapeHtml(entry.condition)}</td><td>${item.quantity}</td></tr>`; }).join('');
    showBoxModal(`${box.label} manifest`, 'Print preview', `<div class="manifest"><header class="manifest-heading"><p class="eyebrow">Box manifest</p><h1>${escapeHtml(drive.name)}</h1><div>${escapeHtml(drive.partner_name)}</div><div>${escapeHtml(drive.destination_description)}</div></header><div class="manifest-meta"><div><strong>${escapeHtml(box.label)}</strong><br>Status: ${box.status}</div><div>Generated: ${new Date().toLocaleString()}</div></div>${shipment ? `<p><strong>Shipment:</strong> ${shipment.shipped_date}${shipment.tracking_reference ? ` · ${escapeHtml(shipment.tracking_reference)}` : ''}</p>` : ''}<div class="table-wrap"><table><thead><tr><th>Title / category</th><th>Reading level</th><th>Condition</th><th>Quantity</th></tr></thead><tbody>${rows}</tbody></table></div><div class="manifest-total">Box total: ${total} books</div><div class="form-actions no-print"><button class="button" type="button" id="back-to-box">Back</button><button class="button primary" type="button" id="print-manifest">Print / Save PDF</button></div></div>`);
    document.querySelector('#back-to-box').addEventListener('click', () => openBoxManager(boxId));
    document.querySelector('#print-manifest').addEventListener('click', () => { document.body.classList.add('printing-manifest'); window.print(); });
  }

  async function replaceCompleteState(candidate, message) {
    if (staleTab) { showError('Reload this stale tab before replacing local data.'); return false; }
    try {
      validateStateEnvelope(candidate);
      state = await repository.replace(candidate);
      staleTab = false;
      closeBoxModal(); render(); showToast(message);
      return true;
    } catch (error) {
      if (error.fallbackState) state = error.fallbackState;
      renderStorageStatus(); showError(error.message); return false;
    }
  }

  function openResetDialog(kind) {
    const isEmpty = kind === 'empty';
    showBoxModal(isEmpty ? 'Start with an empty drive?' : 'Restore fictional samples?', 'Replace complete state', `<div class="notice error-panel">This replaces every current entry, box, shipment, and history event. Export a backup first if you may need this data again.</div><div class="form-actions"><button class="button" type="button" id="backup-before-replace">Export current backup</button><button class="button" type="button" id="cancel-replace">Cancel</button><button class="button primary" type="button" id="confirm-replace">${isEmpty ? 'Start empty' : 'Reset samples'}</button></div>`);
    document.querySelector('#backup-before-replace').addEventListener('click', exportJson);
    document.querySelector('#cancel-replace').addEventListener('click', closeBoxModal);
    document.querySelector('#confirm-replace').addEventListener('click', async event => { event.target.disabled = true; await replaceCompleteState(isEmpty ? createEmptyState(state) : createSampleState(), isEmpty ? 'Empty walkthrough ready.' : 'Sample data restored.'); });
  }

  function openImportPreview(candidate) {
    const drive = byId(candidate.drives, ACTIVE_DRIVE_ID), metrics = calculateMetrics(candidate);
    showBoxModal('Import complete backup?', 'Validated JSON preview', `<div class="notice">Import replaces the complete current state; merge is outside this MVP.</div><div class="location-admin-row"><span>Drive</span><strong>${escapeHtml(drive.name)}</strong></div><div class="location-admin-row"><span>Inventory rows</span><strong>${candidate.entries.length}</strong></div><div class="location-admin-row"><span>Physical books</span><strong>${metrics.received}</strong></div><div class="location-admin-row"><span>Boxes</span><strong>${candidate.boxes.length}</strong></div><div class="location-admin-row"><span>Shipments</span><strong>${candidate.shipments.length}</strong></div><div class="form-actions"><button class="button" type="button" id="backup-before-import">Export current backup</button><button class="button" type="button" id="cancel-import">Cancel</button><button class="button primary" type="button" id="confirm-import">Replace and import</button></div>`);
    document.querySelector('#backup-before-import').addEventListener('click', exportJson);
    document.querySelector('#cancel-import').addEventListener('click', closeBoxModal);
    document.querySelector('#confirm-import').addEventListener('click', async event => {
      if (!window.confirm('Replace all current local demo data with this validated backup?')) return;
      event.target.disabled = true; await replaceCompleteState(candidate, 'Complete backup imported.');
    });
  }

  function showAcceptanceResults() {
    try {
      const checks = runAcceptanceChecks();
      showBoxModal('Acceptance checks passed', 'Local verification', `<div class="allocation-list">${checks.map(([label, passed]) => `<div class="allocation-row"><strong>${escapeHtml(label)}</strong><span class="badge ${passed ? 'accepted' : 'rejected'}">${passed ? 'Pass' : 'Fail'}</span></div>`).join('')}</div><div class="form-actions"><button class="button primary" type="button" id="close-checks">Done</button></div>`);
      document.querySelector('#close-checks').addEventListener('click', closeBoxModal);
    } catch (error) { showError(error.message); }
  }

  function openInventoryModal(entryId) {
    const entry = byId(state.entries, entryId);
    if (!entry) return;
    const allocated = allocationsForEntry(entry.id).reduce((sum, item) => sum + item.quantity, 0);
    const shipped = allocationsForEntry(entry.id).some(item => byId(state.boxes, item.box_id)?.status === 'shipped');
    const locationOptions = state.locations.filter(location => location.drive_id === entry.drive_id && location.active).map(location => `<option value="${location.id}" ${location.id === entry.current_location_id ? 'selected' : ''}>${escapeHtml(location.name)}</option>`).join('');
    elements.inventoryModalTitle.textContent = entry.title || `${entry.category} batch`;
    elements.inventoryModalBody.innerHTML = `
      <div class="notice">This row contains ${entry.quantity} books. Enter a smaller quantity to create a linked split row.</div>
      ${allocated ? `<div class="notice error-panel">${allocated} books are packed${shipped ? ' and shipped' : ''}. Manage the box and unpack them before changing this row.</div>` : ''}
      <form id="manage-entry-form" novalidate>
        <div class="form-grid">
          <div class="field"><label for="manage-quantity">Quantity to update</label><input id="manage-quantity" name="quantity" type="number" min="1" max="${entry.quantity}" step="1" value="${entry.quantity}" required></div>
          <div class="field"><label for="manage-location">Current location</label><select id="manage-location" name="current_location_id">${locationOptions}</select></div>
          <div class="field"><label for="manage-condition">Condition</label><select id="manage-condition" name="condition">${MASTER_DATA.conditions.map(item => `<option value="${item.value}" ${item.value === entry.condition ? 'selected' : ''}>${item.label}</option>`).join('')}</select></div>
          <div class="field"><label for="manage-reading">Reading level</label><select id="manage-reading" name="reading_level">${MASTER_DATA.readingLevels.map(item => `<option value="${item.value}" ${item.value === entry.reading_level ? 'selected' : ''}>${item.label}</option>`).join('')}</select></div>
          <div class="field"><label for="manage-decision">Decision</label><select id="manage-decision" name="decision">${MASTER_DATA.decisions.map(item => `<option value="${item.value}" ${item.value === entry.decision ? 'selected' : ''}>${item.label}</option>`).join('')}</select></div>
          <div class="field" id="manage-rejection-field" ${entry.decision === 'rejected' ? '' : 'hidden'}><label for="manage-rejection">Rejection reason</label><input id="manage-rejection" name="rejection_reason" maxlength="240" value="${escapeHtml(entry.rejection_reason)}"></div>
        </div>
        <div class="form-actions"><button class="button" type="button" id="cancel-entry-update">Cancel</button><button class="button primary" type="submit" ${allocated ? 'disabled' : ''}>${entry.quantity > 1 ? 'Apply update or split' : 'Apply update'}</button></div>
      </form>`;
    elements.inventoryModal.hidden = false;
    const form = document.querySelector('#manage-entry-form');
    const decisionSelect = document.querySelector('#manage-decision');
    decisionSelect.addEventListener('change', () => { document.querySelector('#manage-rejection-field').hidden = decisionSelect.value !== 'rejected'; });
    document.querySelector('#cancel-entry-update').addEventListener('click', closeInventoryModal);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = new FormData(form);
      const quantity = Number(data.get('quantity'));
      const decision = String(data.get('decision'));
      const rejectionReason = String(data.get('rejection_reason') || '').trim();
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > entry.quantity) { showError(`Enter a whole quantity from 1 to ${entry.quantity}.`); return; }
      if (decision === 'rejected' && !rejectionReason) { showError('A rejection reason is required.'); return; }
      if (allocated) { showError('Packed inventory cannot be transferred, split, or reclassified.'); return; }
      const candidate = clone(state);
      const source = byId(candidate.entries, entry.id);
      const updates = {
        current_location_id: String(data.get('current_location_id')),
        condition: String(data.get('condition')),
        reading_level: String(data.get('reading_level')),
        decision,
        rejection_reason: decision === 'rejected' ? rejectionReason : '',
        updated_at: nowIso()
      };
      const isSplit = quantity < source.quantity;
      let affectedId = source.id;
      if (isSplit) {
        source.quantity -= quantity;
        source.version += 1;
        source.updated_at = nowIso();
        const child = { ...clone(source), ...updates, id: uid('entry'), quantity, parent_entry_id: source.id, version: 1, created_at: nowIso(), updated_at: nowIso() };
        candidate.entries.push(child);
        affectedId = child.id;
      } else {
        Object.assign(source, updates, { version: source.version + 1 });
      }
      candidate.revision += 1;
      candidate.changeEvents.push({ id: uid('event'), drive_id: entry.drive_id, entity_type: 'inventory_entry', entity_id: affectedId, action: isSplit ? 'split_and_updated' : 'updated', before_values: clone(entry), after_values: clone(byId(candidate.entries, affectedId)), actor_id: ACTOR_ID, timestamp: nowIso() });
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      const saved = await commitCandidate(candidate, isSplit ? 'Inventory split and updated.' : 'Inventory updated.');
      if (saved) closeInventoryModal(); else submitButton.disabled = false;
    });
  }

  // Event bindings
  document.querySelectorAll('.nav-button').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  document.querySelectorAll('[data-open-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.openView)));
  document.querySelectorAll('[data-entry-mode]').forEach(button => button.addEventListener('click', () => setReceiveMode(button.dataset.entryMode)));
  setReceiveMode('batch');

  document.querySelector('#receive-decision').addEventListener('change', event => { elements.receiveRejectionField.hidden = event.target.value !== 'rejected'; });

  elements.receiveForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submitter = event.submitter;
    const data = new FormData(elements.receiveForm);
    const mode = elements.receiveForm.dataset.entryMode || 'batch';
    const title = String(data.get('title') || '').trim();
    const quantity = Number(data.get('quantity'));
    const originId = String(data.get('origin_location_id') || '');
    const decision = String(data.get('decision'));
    const rejectionReason = String(data.get('rejection_reason') || '').trim();
    if (mode === 'title' && !title) { showError('Enter a title for an individual-title entry.'); return; }
    if (!Number.isInteger(quantity) || quantity < 1) { showError('Quantity must be a positive whole number.'); return; }
    if (!byId(state.locations, originId) || byId(state.locations, originId).type !== 'collection') { showError('Select a valid collection origin.'); return; }
    if (decision === 'rejected' && !rejectionReason) { showError('A rejection reason is required.'); return; }
    const similar = mode === 'title' && state.entries.some(entry => entry.entry_mode === 'title' && entry.origin_location_id === originId && entry.title.trim().toLowerCase() === title.toLowerCase());
    if (similar && !window.confirm('A similar title already exists for this origin. Add another donation anyway?')) return;
    elements.appError.hidden = true;
    [...elements.receiveForm.querySelectorAll('button[type="submit"]')].forEach(button => { button.disabled = true; });
    const candidate = clone(state);
    const entry = {
      id: uid('entry'), drive_id: ACTIVE_DRIVE_ID, origin_location_id: originId, current_location_id: originId,
      entry_mode: mode, title: mode === 'title' ? title : '', category: String(data.get('category')), quantity,
      condition: String(data.get('condition')), reading_level: String(data.get('reading_level')), decision,
      rejection_reason: decision === 'rejected' ? rejectionReason : '', parent_entry_id: null,
      notes: String(data.get('notes') || '').trim(), version: 1, created_by: ACTOR_ID, created_at: nowIso(), updated_at: nowIso()
    };
    candidate.entries.push(entry);
    candidate.revision += 1;
    candidate.changeEvents.push({ id: uid('event'), drive_id: ACTIVE_DRIVE_ID, entity_type: 'inventory_entry', entity_id: entry.id, action: 'received', before_values: null, after_values: clone(entry), actor_id: ACTOR_ID, timestamp: nowIso() });
    const saved = await commitCandidate(candidate, `${quantity} books received.`);
    [...elements.receiveForm.querySelectorAll('button[type="submit"]')].forEach(button => { button.disabled = false; });
    if (!saved) return;
    elements.receiveForm.reset();
    elements.receiveForm.elements.quantity.value = 1;
    elements.receiveRejectionField.hidden = true;
    setReceiveMode('batch');
    renderSelectOptions();
    if (submitter?.dataset.saveMode !== 'continue') switchView('inventory');
  });

  ['#inventory-search', '#filter-origin', '#filter-current', '#filter-reading', '#filter-decision', '#filter-packing'].forEach(selector => {
    const element = document.querySelector(selector);
    element.addEventListener(element.matches('input') ? 'input' : 'change', renderInventory);
  });

  elements.inventoryTable.addEventListener('click', event => {
    const button = event.target.closest('[data-manage-entry]');
    if (button) openInventoryModal(button.dataset.manageEntry);
  });
  document.querySelector('#close-inventory-modal').addEventListener('click', closeInventoryModal);
  elements.inventoryModal.addEventListener('click', event => { if (event.target === elements.inventoryModal) closeInventoryModal(); });
  document.querySelector('#new-box').addEventListener('click', openCreateBox);
  elements.boxGrid.addEventListener('click', event => {
    const manage = event.target.closest('[data-manage-box]'), manifest = event.target.closest('[data-box-manifest]');
    if (manage) openBoxManager(manage.dataset.manageBox);
    if (manifest) openManifest(manifest.dataset.boxManifest);
  });
  document.querySelector('#close-box-modal').addEventListener('click', closeBoxModal);
  elements.boxModal.addEventListener('click', event => { if (event.target === elements.boxModal) closeBoxModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { if (!elements.inventoryModal.hidden) closeInventoryModal(); if (!elements.boxModal.hidden) closeBoxModal(); } });
  window.addEventListener('afterprint', () => document.body.classList.remove('printing-manifest'));
  document.querySelector('#download-inventory-template').addEventListener('click', downloadInventoryTemplate);
  document.querySelector('#upload-inventory-csv').addEventListener('click', () => elements.importInventoryCsvFile.click());
  document.querySelector('#export-inventory-csv').addEventListener('click', exportInventoryCsv);
  document.querySelector('#export-allocations-csv').addEventListener('click', exportAllocationsCsv);
  document.querySelector('#export-json').addEventListener('click', exportJson);
  document.querySelector('#import-json').addEventListener('click', () => elements.importFile.click());
  document.querySelector('#run-self-checks').addEventListener('click', showAcceptanceResults);
  document.querySelector('#start-empty').addEventListener('click', () => openResetDialog('empty'));
  document.querySelector('#reset-sample').addEventListener('click', () => openResetDialog('sample'));
  elements.downloadRecovery.addEventListener('click', () => { if (repository.recoveryContent) downloadFile('donar-malformed-storage.txt', repository.recoveryContent, 'text/plain;charset=utf-8'); });
  elements.importInventoryCsvFile.addEventListener('change', async () => {
    const file = elements.importInventoryCsvFile.files?.[0];
    elements.importInventoryCsvFile.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showError('CSV import rejected: the demo limit is 5 MB.'); return; }
    try { openInventoryCsvPreview(parseInventoryImport(await file.text())); }
    catch (error) { showError(`CSV import rejected without changing current data: ${error.message}`); }
  });
  elements.importFile.addEventListener('change', async () => {
    const file = elements.importFile.files?.[0];
    elements.importFile.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showError('Import rejected: the demo limit is 5 MB.'); return; }
    try {
      const parsed = JSON.parse(await file.text());
      delete parsed.exportedAt;
      const candidate = clone(validateStateEnvelope(parsed));
      runAcceptanceChecks(candidate);
      openImportPreview(candidate);
    } catch (error) { showError(`Import rejected without changing current data: ${error.message}`); }
  });
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) {
      staleTab = true; renderStorageStatus(); showError('Another tab changed this demo. This tab is now read-only; reload before editing.');
    }
  });

  elements.driveForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (staleTab) { showError('Reload this stale tab before editing.'); return; }
    const form = new FormData(elements.driveForm);
    const name = String(form.get('name') || '').trim();
    const partner = String(form.get('partner_name') || '').trim();
    const destination = String(form.get('destination_description') || '').trim();
    const rawGoal = String(form.get('goal_accepted_quantity') || '').trim();
    const goal = rawGoal === '' ? null : Number(rawGoal);
    if (!name || !partner || !destination || (goal !== null && (!Number.isInteger(goal) || goal < 1))) {
      showError('Enter a drive name, partner, destination, and an optional positive whole-number goal.');
      return;
    }
    elements.appError.hidden = true;
    elements.saveDrive.disabled = true;
    const candidate = clone(state);
    const drive = byId(candidate.drives, ACTIVE_DRIVE_ID);
    const before = clone(drive);
    Object.assign(drive, { name, partner_name: partner, destination_description: destination, goal_accepted_quantity: goal, guidance_text: String(form.get('guidance_text') || '').trim() });
    candidate.revision += 1;
    candidate.changeEvents.push({ id: `event-${Date.now()}`, drive_id: ACTIVE_DRIVE_ID, entity_type: 'drive', entity_id: ACTIVE_DRIVE_ID, action: 'setup_updated', before_values: before, after_values: clone(drive), actor_id: ACTOR_ID, timestamp: nowIso() });
    try {
      state = await repository.save(candidate);
      render();
      showToast('Drive setup saved in this browser.');
    } catch (error) {
      if (error.fallbackState) state = error.fallbackState;
      renderStorageStatus();
      showError(error.message);
    } finally {
      elements.saveDrive.disabled = false;
    }
  });

  elements.locationForm.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(elements.locationForm);
    const name = String(data.get('name') || '').trim();
    const type = String(data.get('type'));
    if (!name) { showError('Enter a location name.'); return; }
    if (!['collection', 'central'].includes(type)) { showError('Select a valid location type.'); return; }
    if (state.locations.some(location => location.drive_id === ACTIVE_DRIVE_ID && location.name.toLowerCase() === name.toLowerCase())) { showError('A location with this name already exists.'); return; }
    const candidate = clone(state);
    if (type === 'central') candidate.locations.filter(location => location.drive_id === ACTIVE_DRIVE_ID && location.type === 'central').forEach(location => { location.type = 'collection'; });
    const location = { id: uid('loc'), drive_id: ACTIVE_DRIVE_ID, name, type, active: true };
    candidate.locations.push(location);
    candidate.revision += 1;
    candidate.changeEvents.push({ id: uid('event'), drive_id: ACTIVE_DRIVE_ID, entity_type: 'location', entity_id: location.id, action: 'location_created', before_values: null, after_values: clone(location), actor_id: ACTOR_ID, timestamp: nowIso() });
    document.querySelector('#add-location').disabled = true;
    const saved = await commitCandidate(candidate, type === 'central' ? 'Central sorting location changed.' : 'Collection location added.');
    document.querySelector('#add-location').disabled = false;
    if (saved) elements.locationForm.reset();
  });

  // Bootstrap
  async function boot() {
    try {
      state = await repository.load();
    } catch (error) {
      if (error.fallbackState) state = error.fallbackState;
      showError(error.message);
    }
    render();
  }

  boot();
})();
