# DONAR — Community Book Drive Tracker

Interactive local MVP for receiving, reviewing, packing, and shipping fictional book-drive inventory.

## Run locally

From this directory:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

No installation or build step is required. Data is stored in browser `localStorage` under `bookDrive.demo.v1`.

The included fictional sample drive covers Austin, Leander, Cedar Park, and a North Austin sorting hub.

## Source structure

- `index.html` — semantic page structure and component containers
- `styles.css` — responsive application styling and Tailwind fallback styles
- `app.js` — one browser JavaScript file organized into seed state, validation, repository, domain queries, rendering components, controllers, and bootstrap functions
- `mockups/index.html` — earlier visual prototype retained as a reference

The MVP remains vanilla JavaScript with no package installation, framework, bundler, or frontend build step.

Categories, conditions, reading levels, and decisions are defined once as master data in `app.js`. Default Austin-area locations are predefined there as fictional seeds. Origin dropdowns use active collection locations, while current-location dropdowns use every active location saved for the drive.

## Phase 3 walkthrough

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

All included records and shipment actions are fictional.

## Implementation phases

- [x] Phase 1 — application skeleton, Texas sample state, repository boundary, and reload persistence
- [x] Phase 2 — receiving, sorting, transfers, splits, filters, and reconciled metrics
- [x] Phase 3 — packing, manifests, shipment locking, and reversal workflow
- [ ] Phase 4 — validated imports/exports, storage recovery, accessibility, and acceptance checks
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
