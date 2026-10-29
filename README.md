# DONAR — Community Book Drive Tracker

Interactive local MVP for receiving, reviewing, packing, and shipping fictional book-drive inventory.

## Run locally

### Prerequisite

The app has no package dependencies or build step. You only need Python 3 to serve the static files:

```bash
python3 --version
```

### Start the app

Open a terminal and run:

```bash
cd /Users/rajavk/yathin/book-tracker
python3 -m http.server 8080 --bind 127.0.0.1
```

Then open [http://127.0.0.1:8080](http://127.0.0.1:8080).

The terminal should remain open while testing. Stop the server with `Ctrl+C`.

### If port 8080 is already in use

Choose another port, for example:

```bash
python3 -m http.server 8081 --bind 127.0.0.1
```

Then open [http://127.0.0.1:8081](http://127.0.0.1:8081). Browser storage is isolated by origin and port, so data saved on port 8080 will not automatically appear on port 8081.

To identify a process already using port 8080 on macOS:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
```

### Verify the server

In another terminal:

```bash
curl -I http://127.0.0.1:8080/
```

A successful response includes `HTTP/1.0 200 OK` or `HTTP/1.1 200 OK`.

### Optional source checks

```bash
node --check app.js
git diff --check
```

Node.js is only needed for the optional JavaScript syntax check; it is not required to run the app.

Do not rely on opening `index.html` directly with a `file://` URL. Browser asset loading, download, and storage behavior can differ. Serve the project directory over localhost instead.

Data is stored in browser `localStorage` under `bookDrive.demo.v1` for the exact browser origin and port.

The included fictional sample drive covers Austin, Leander, Cedar Park, and a North Austin sorting hub.

## Source structure

- `index.html` — semantic page structure and component containers
- `styles.css` — responsive application styling and Tailwind fallback styles
- `app.js` — one browser JavaScript file organized into seed state, validation, repository, domain queries, rendering components, controllers, and bootstrap functions
- `mockups/index.html` — earlier visual prototype retained as a reference

The MVP remains vanilla JavaScript with no package installation, framework, bundler, or frontend build step.

Categories, conditions, reading levels, and decisions are defined once as master data in `app.js`. Default Austin-area locations are predefined there as fictional seeds. Origin dropdowns use active collection locations, while current-location dropdowns use every active location saved for the drive.

## Phase 4 walkthrough

1. Review reconciled sample counts on the Dashboard.
2. Open Receive and add a category batch or individual title.
3. Use “Save and add another” for rapid intake.
4. Filter Inventory by origin, current location, reading level, decision, or packing state.
5. Manage an unallocated row to transfer, classify, edit, or split part of its quantity.
6. Open Setup to add a collection location or designate a different central sorting location.
7. Reload the same browser and origin; all saved changes are restored.
8. Open Boxes, create a box, and add available accepted inventory from central sorting.
9. Verify that partial quantities reduce the available quantity without changing received totals.
10. Enter the exact physical count and mark the box ready.
11. Preview and print the box manifest.
12. Record a simulated shipment and confirm that its contents become locked.
13. Reverse the shipment with a reason, correct the box, and verify it again.
14. Export inventory and box-allocation CSV reports.
15. Export a complete JSON backup, start empty, then import the backup and confirm all counts and shipments return.
16. Try importing malformed or overallocated JSON and confirm current data remains unchanged.
17. Open the same origin in another tab, change data there, and confirm the stale tab blocks further saves.
18. Run the built-in acceptance checks from Setup.
19. Download the inventory CSV template, fill it locally, upload it, review the preview, and append the validated rows.

### Inventory CSV template

The template columns are:

`entry_mode,title,category,quantity,origin_location,current_location,condition,reading_level,decision,rejection_reason,notes`

Use exact active location names or IDs. `current_location` may be blank to default to the origin. Master-data values may use their stored value or displayed label. CSV import appends inventory only; it does not import packing or shipment records.

All included records and shipment actions are fictional.

## Implementation phases

- [x] Phase 1 — application skeleton, Texas sample state, repository boundary, and reload persistence
- [x] Phase 2 — receiving, sorting, transfers, splits, filters, and reconciled metrics
- [x] Phase 3 — packing, manifests, shipment locking, and reversal workflow
- [x] Phase 4 — validated imports/exports, storage recovery, accessibility, and acceptance checks
- [ ] Phase 5 — organizer walkthrough and feedback capture

## Database migration after MVP approval

Do not add a database until the local workflow has been reviewed. If a shared pilot is approved:

1. Confirm the real partner rules, user roles, data owner, backup owner, and whether shipment handoff or final delivery must be tracked.
2. Create a Supabase project and PostgreSQL migrations for drives, locations, inventory entries, boxes, box items, shipments, change events, profiles, and drive memberships.
3. Add foreign keys, positive-quantity checks, allowed-value checks, unique IDs, and indexes for drive, location, decision, and box lookups.
4. Configure Supabase Auth and decide how organizers and volunteers are invited.
5. Enable Row Level Security on every exposed table. Test anonymous access denial, cross-drive isolation, and organizer versus volunteer permissions.
6. Move authoritative split, transfer, packing, shipment, reversal, history, and idempotency rules into transactional PostgreSQL functions with row locking.
7. Implement a Supabase repository adapter with the same async interface used by the current local repository. Keep rendering and form controllers independent of the storage implementation.
8. Test concurrent packing, stale versions, session expiry, shipment locks, and backup/restore on at least two devices.
9. Select hosting only after authentication is working, configure production URLs, and deploy a small pilot.
10. Import real data only through validated migration tooling; never carry fictional seed records into production accidentally.
