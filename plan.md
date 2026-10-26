# Community Book Drive Tracker — MVP PRD and Build Plan

Version: 1.2 | Date: October 25, 2026 | Project lead: Sai

## 1. Purpose

Build a simple web app that helps student volunteers track books from multiple collection sites through central sorting, acceptance review, packing, and shipment to a nonprofit's designated destination.

The current deliverable is a local MVP demo using fictional sample data and browser localStorage. No database service, accounts, hosting setup, or deployment is required. The demo validates faster entry, reliable quantities, and printable box manifests before a shared pilot. It supports both individual titles and batches by category. A shared spreadsheet or Airtable can validate the workflow before implementation; integration with either is outside the MVP.

## 2. Problem and hypothesis

Books collected at different schools or community sites must reach one central location. Organizers need to know what has arrived, what qualifies for donation, what is still awaiting review, and which books are in each box.

**Hypothesis to validate:** A lightweight tracker with batch entry and box manifests reduces reconciliation work compared with the organizer's current process. This is a proposed workflow, not a confirmed gap in existing products.

## 3. Users and demo scope

| User | Main task | Access |
| --- | --- | --- |
| Organizer / student lead | Present and operate the local demo | All demo operations; no login |
| Volunteer reviewer | Try receiving, sorting, and packing with the presenter | Same local demo; separate accounts deferred |

Demo: one active drive, 2–5 fictional collection sites, one central sorting location, and one active browser tab. No multi-user or multi-device synchronization. Preserve drive IDs in all records so future drives remain separate.

A volunteer is not a donor record. Do not collect donor names, student IDs, home addresses, or recipient children's information for this MVP.

## 4. Discovery and demo feedback

Build with the stated defaults; interviews do not block the demo. Use the demo to gather feedback from 2–3 organizers or nonprofit contacts. Ask:

- How do you track collections at multiple sites today? Where do counts become unreliable?
- Do you need titles, category totals, or both?
- Who confirms book suitability, and what guidelines apply to this specific drive?
- What information belongs on a box label and manifest?
- Does “shipped” mean handed to a carrier, delivered to a U.S. warehouse, or sent overseas?
- Will volunteers use personal phones? Is internet access available at sorting?

Confirm accepted categories, reading levels, destination, and required paperwork with the partner before the pilot. Do not hardcode or imply compliance with any organization's rules. The app's manifest supplements required partner forms unless the partner explicitly accepts it as a replacement.

## 5. MVP scope

### Must have

1. Create a drive with name, optional accepted-book goal, partner name, confirmed guidance text/link, and destination description.
2. Add named collection locations and designate the central sorting location.
3. Record books by individual title or category batch, with quantity and origin site.
4. Move inventory to the central location without recording another donation.
5. Classify books as pending review, accepted, or rejected; retain rejection reasons.
6. Split mixed batches when condition, reading level, acceptance, or box assignment differs.
7. Assign accepted books to boxes, including partial quantities across multiple boxes.
8. Show received, pending, accepted, rejected, packed, and shipped counts separately.
9. Print/export per-box manifests and export the inventory as CSV.
10. Record shipment date and box membership; protect shipped inventory from ordinary edits.
11. Persist full demo state in localStorage and restore it on reload in the same browser/origin.
12. Include sample data, confirmed Reset sample data, and validated full-state JSON export/import.
13. Show a persistent “Demo — data stored only in this browser” notice and clear storage errors.

### Outside MVP

Supabase provisioning, authentication, role enforcement, shared database, concurrent users, hosting/deployment, cloud backups, ISBN scanning and lookup, AI classification, donor CRM, fundraising/payments, public volunteer sign-up, delivery routing, carrier integration, offline synchronization, photos, nonprofit API integrations, multi-organization tenancy, and spreadsheet round-trip import.

## 6. User workflow

1. **Set up:** Presenter loads fictional samples or creates a local drive, locations, and guidance. No sign-in.
2. **Receive:** Volunteer selects the collection site and enters a title or category, quantity, condition, and reading level. Default acceptance is pending review.
3. **Transfer:** Volunteer records all or part of a batch arriving at the central location. Original collection site remains unchanged.
4. **Sort:** Volunteer checks partner guidance, splits mixed batches if needed, then marks quantities accepted or rejected. A rejected row requires a reason.
5. **Pack:** Organizer creates a box and assigns available accepted quantities. Books must be at the central location before packing.
6. **Reconcile:** Organizer compares the physical box count with the generated manifest, then marks the box ready.
7. **Ship:** Organizer selects ready boxes, enters the shipment date and destination, and confirms handoff. Box contents become locked.
8. **Report:** Presenter exports CSV reports, prints manifests, and downloads a full-state JSON backup.

“Shipped” records the handoff defined for this drive. It does not prove arrival in Africa or delivery to a library.

## 7. Screens and interface

| Screen | Required content and actions |
| --- | --- |
| Dashboard | Drive selector; count cards; location summary; goal progress; Add donation button |
| Inventory | Search title/category; filter origin, current location, reading level, decision, and packing; edit, split, transfer, classify, pack |
| Add / edit donation | Batch mode by default; optional title mode; quantity controls; reusable location defaults; Save and add another |
| Boxes and shipping | Box contents, available accepted inventory, reconciled count, ready state, shipment action, manifest preview |
| Drive setup | Locations, goal, partner guidance, destination, CSV/JSON export, JSON import, Reset sample data |

Use a modern light theme, mobile-friendly forms, clearly labeled fields, keyboard support, and text status labels alongside colors. Frontend deliverable: one self-contained `index.html` with embedded vanilla JavaScript and styles, using Tailwind CSS via CDN. No frontend build step or JavaScript framework. Internet is needed for CDN styling; include minimal embedded fallback CSS so core forms and print layout remain usable if it fails. There are no inventory network requests.

## 8. Data model

Each inventory row represents a homogeneous group of physical copies: one origin, current location, category, condition, reading level, and acceptance decision. A row may describe one title or a category batch. Several rows may share a title without being duplicates.

| Entity | Fields |
| --- | --- |
| Drive | id, name, partner_name, guidance_text, guidance_url, goal_accepted_quantity (optional), destination_description, status, created_at |
| Location | id, drive_id, name, type (`collection` or `central`), active |
| InventoryEntry | id, drive_id, origin_location_id, current_location_id, entry_mode (`title` or `batch`), title (optional), category, quantity, condition, reading_level, decision, rejection_reason (optional), parent_entry_id (optional), notes, version, created_by, created_at, updated_at |
| Box | id, drive_id, label, status (`open`, `ready`, `shipped`), verified_quantity (optional), shipment_id (optional), version |
| BoxItem | id, box_id, inventory_entry_id, quantity |
| Shipment | id, drive_id, shipped_date, destination, tracking_reference (optional), created_by, created_at |
| ChangeEvent | id, drive_id, entity_type, entity_id, action, before_values, after_values, actor_id, timestamp |

Store entities as arrays in a JSON envelope with `schemaVersion`, `revision`, `drives`, `locations`, `entries`, `boxes`, `boxItems`, `shipments`, and `changeEvents`. Use `demo` for actor fields; no real users are needed. Local history is editable and provides no security guarantee.

Default categories: storybooks, nonfiction, textbooks, other. Default conditions: new, good, worn, damaged, unknown. Default reading levels: early reader, elementary, middle school, high school, mixed/unknown. Organizer confirms these labels during discovery. Condition alone never automatically determines acceptance.

Required entry fields: drive, origin, current location, mode, category, positive integer quantity, condition, reading level, decision. Title is required only in title mode. Unknown values are allowed for condition and reading level to keep receiving fast.

`Box ID` belongs to box allocations; `Shipped date` belongs to the shipment. Display them alongside inventory in the UI/export rather than storing competing copies on an inventory row.

## 9. Count definitions and integrity rules

All dashboard figures count physical copies, not inventory rows.

| Metric | Definition |
| --- | --- |
| Received | Sum of quantities of active inventory entries |
| Pending | Quantity with decision `pending` |
| Accepted | Quantity with decision `accepted`, including packed and shipped copies |
| Rejected | Quantity with decision `rejected` |
| Packed | Sum of box allocations, including shipped boxes |
| Shipped | Allocated quantity in boxes linked to a shipment |
| Accepted, unpacked | Accepted minus packed |
| Packed, not shipped | Packed minus shipped |
| Goal progress | Accepted / accepted-book goal; show excess above goal; omit if no goal |

Invariants:

- Received = Pending + Accepted + Rejected.
- Shipped ≤ Packed ≤ Accepted ≤ Received.
- Quantity must be a positive integer. No fractional or negative books.
- Origin and current location must belong to the same drive as the entry.
- A split preserves total quantity and provenance. Example: split 100 pending into 80 accepted and 20 rejected; received remains 100. The source row becomes 80 and a linked child row becomes 20; do not retain an additional counted 100-copy parent.
- Partial transfers use the same split operation. Location changes never increase received totals.
- Multiple box allocations are allowed, but their sum cannot exceed the entry quantity. Available quantity = entry quantity minus all its allocations.
- Only accepted entries at the central location may be allocated. Entries, boxes, and shipments must belong to the same drive.
- Allocated entries cannot be rejected, transferred, or reduced below their allocated quantity. Unpack first. Splits are allowed only before allocation in the MVP.
- Any contents change resets a ready box to open and clears its verification. A ready box requires a nonzero quantity and a physical verified count matching its manifest total.
- Shipment confirmation requires ready boxes and a nonfuture shipment date. One box belongs to at most one shipment.
- Shipped contents cannot be changed through ordinary edit actions. Organizer must use a logged reversal with a reason before correcting and reconfirming the shipment.
- Record corrections in history. The demo operator may void a mistaken, unallocated entry with a reason. Voided entries are excluded from operational totals and retained in history. Do not void rejected books just to remove them from the dashboard.
- Validate each action against a cloned state, verify all count invariants, save the full state once, then update the UI. On validation/storage failure retain the previous state and preserve unsaved form input. Local checks are demo behavior, not security or database transactions.
- Listen for storage changes from another tab; block stale edits and request reload. Only one active tab is supported; safe simultaneous editing is deferred.
- Disable Save during processing to prevent double-click duplicates. Warn on similar title/site/date entries but allow intentional repeated donations. Backend request idempotency is deferred.

## 10. Manifest and export requirements

Per-box manifest includes drive, partner, destination, box label, generated timestamp, title or category, reading level, condition, allocated quantity, and box total. Include shipment date/reference after shipment. Print uses browser print-to-PDF; no PDF generation service is required.

Inventory CSV includes stable entry ID, origin, current location, title/category, condition, reading level, decision, rejection reason, received quantity, packed quantity, shipped quantity, and allocated box labels. Export box allocations separately with one row per entry/box allocation and its allocated quantity. Do not repeat full received quantities across allocation rows and then sum them.

Escape CSV correctly, preserve Unicode, and neutralize spreadsheet formula prefixes in user text. Show a preview before printing. CSV is for reporting; use full-state JSON export to restore the local demo.

## 11. Local demo architecture

**Stack:** one `index.html` with embedded vanilla JavaScript, CSS, fictional seed data, and localStorage persistence. Tailwind CSS via CDN provides the light theme. No Flask, SQLite, Supabase account, JavaScript library, Node.js build step, or hosting service is required.

Keep UI rendering, domain actions, and storage behind separate functions inside this single HTML file. Use an asynchronous repository interface for load/save/reset/import/export, so a future Supabase adapter can replace local storage. Do not scatter direct localStorage writes across UI handlers.

Deliverables when implementation starts: `index.html`, `README.md`, and this `plan.md`. The HTML is the sole application file.

### Running and saving

- Preferred: serve the folder with an existing static server, for example `python3 -m http.server 8000`, then open `http://localhost:8000`. Python only serves files; it is not an application backend.
- Direct `file://` preview is allowed, but storage behavior varies by browser. On unavailable storage show explicit temporary-memory mode, recommend localhost, and offer JSON export. Never claim data was saved when persistence fails.
- Use a namespaced key such as `bookDrive.demo.v1`. Seed only on the first run; do not overwrite saved changes on reload.
- Clearing browser data, using private browsing, changing origin/port, or switching devices can remove or isolate data. Explain this in demo help.
- On quota or storage denial, retain the last committed state, show the save error, and preserve unsaved form input. Offer JSON export of the committed state.
- On malformed stored JSON, offer download of the original content before an explicit reset or valid import. Do not silently overwrite it.
- All data is fictional and all shipment actions are visibly simulated. No carrier, nonprofit, or user is contacted.

## 12. Sample data and demo controls

### Samples

Include fictional Sites A and B and Central Sorting. Seed title and batch entries, different reading levels and conditions, pending/accepted/rejected decisions, and open/ready/shipped boxes. Label partner and destination as placeholders. Counts must reconcile and make sense without external data.

Provide a start-empty option for the acceptance walkthrough. Reset sample data requires confirmation and offers export first. Cancellation preserves all current data.

### Full-state JSON export/import

- Export every entity and relationship with schema version and export timestamp, independent of active filters.
- Import through a file picker; maximum 5 MB for the demo. Parse as data only.
- Validate schema version, array shapes, required fields, allowed enums, unique IDs, dates, positive quantities, relationships, drive boundaries, allocation limits, box/shipment states, and count invariants.
- Preview drive name, entries, books, and boxes. Explain that import replaces the complete current state; merge is outside scope.
- Offer export of existing data and require confirmation. Validate fully and persist successfully before replacing current UI state. Invalid imports leave state unchanged.
- Export → reset → import must reproduce counts, manifests, simulated shipments, and local history.

## 13. Demo acceptance criteria

| Scenario | Expected result |
| --- | --- |
| First run | Fictional samples appear with a browser-only demo notice |
| Receive 100 at Site A and 50 at Site B in an empty drive | Received 150; pending 150; origin totals 100/50 |
| Transfer Site A's 100 to central | Received stays 150; origin A stays 100; central increases by 100 |
| Split Site A into 80 accepted and 20 rejected | Received 150; accepted 80; rejected 20; pending 50 |
| Pack 30 accepted copies in Box 1 and 50 in Box 2 | Packed 80; accepted-unpacked 0; box totals 30/50 |
| Overallocate or pack pending/rejected books | Action rejected; prior state unchanged |
| Verify and simulate shipping Box 1 | Shipped 30; packed-not-shipped 50; accepted stays 80 |
| Edit shipped contents | Blocked until local reversal with a reason |
| Double-click Save | One entry is created |
| Print Box 2 manifest | Only its allocations appear; total 50; UI controls hidden |
| Reload same browser/origin | Last saved state restored |
| Open another browser/device | Independent state; no synchronization claim |
| Export JSON, reset, then import export | Full previous state restored |
| Import malformed data or broken/overallocated relationships | Rejected without altering current data |
| Cancel reset/import confirmation | Current state preserved |
| Storage unavailable/full | Clear error or explicit temporary mode; no false saved message |
| Another tab changes state | Stale tab blocks edits and requests reload |
| Enter HTML-like text or CSV formula text | Safe text rendering and spreadsheet export |
| Phone viewport and keyboard use | Core forms, filters, and buttons remain usable |
| Tailwind CDN fails | Core forms and print layout usable through fallback CSS |

Authentication, RLS, concurrent database writes, deployment, and shared-device access are Phase 2 criteria, not requirements for demo completion.

## 14. Demo build sequence

Indicative effort: 12–20 focused hours plus feedback; this is a planning estimate.

1. **Skeleton and samples — 2–3 hours:** Single HTML, navigation, state envelope, seeds, demo notice, repository adapter. Exit: reload preserves saved edits.
2. **Receiving and sorting — 3–5 hours:** Locations, title/batch forms, splits, transfers, decisions, filters, and metrics. Exit: 150-book walkthrough reconciles.
3. **Packing and manifests — 3–5 hours:** Partial allocations, verification, simulated shipping/reversal, print. Exit: box counts match manifests.
4. **Demo controls and verification — 3–5 hours:** CSV, validated JSON import/export, reset, storage failures, responsive/keyboard checks, focused domain checks. Exit: acceptance criteria pass.
5. **Organizer walkthrough — 1–2 hours:** Sai presents the demo, observes friction, and captures requested changes. No deployment required.

Do not provision Supabase or select hosting during these steps. Review the demo before committing to a shared pilot.

## 15. Demo success and student ownership

Demo success targets:

- A repeat volunteer enters a homogeneous batch within 30 seconds.
- Received quantities reconcile with decisions; every shipped box reconciles with its manifest.
- No duplicate allocations or unexplained inventory discrepancies remain during the simulated shipment walkthrough.
- Organizer can identify unreviewed books and print a box manifest without manual spreadsheet reconciliation.
- At least one organizer provides feedback on whether the tool saves time and should be reused.

Sai should lead interviews, prioritize features, demonstrate the app, and capture organizer feedback. Real volunteer onboarding and operational impact measurement follow in the shared pilot. Document actual sites coordinated, accepted books, rejected books, boxes handed off, time observations, and organizer feedback. Count library delivery or beneficiary impact only when the partner confirms it. Preserve a short case study with the problem, prototype, pilot results, and next improvement.

## 16. Decisions to confirm during discovery

- Partner organization, current acceptance guidelines, and final manifest format.
- Who may classify books and who records physical box verification.
- Whether collections must be recorded at each site or only when they arrive centrally.
- Internet availability and the need for a paper fallback during receiving.
- After demo review: who owns the source repository and future backend, provisions accounts, and maintains backups.
- Whether tracking real shipment handoff is enough or a later delivery-confirmation feature is needed.

Default demo assumptions: one browser tab, fictional data, manual entry, category batches first, human acceptance decisions, central packing, and simulated shipment handoff. Proceed with these defaults for a prototype; confirm them before using real drive data.


## 17. Phase 2 — shared pilot and hosting decision

Deferred until demo review. Supabase remains the proposed shared backend: PostgreSQL, authentication, and Data APIs. It is not needed to run the demo.

1. Review organizer feedback and revise scope.
2. Add schema migrations, Auth profiles, protected drive memberships, and RLS on exposed tables.
3. Replace local persistence with a Supabase repository adapter. Move authoritative validation, idempotency, roles, history, and multi-row workflows into transactional PostgreSQL functions with row locking. Browser validation alone is insufficient.
4. Test anonymous/cross-drive access denial, organizer/volunteer permissions, concurrent packing, session expiry, shipment locks, and backup/restore.
5. Choose authentication/onboarding. Verify default email delivery restrictions before relying on volunteer invitations or recovery emails; evaluate social sign-in or a configured email provider.
6. Decide **GitHub Pages versus Cloudflare Pages** based on then-current terms and authentication needs. GitHub Pages advises against sensitive password transactions; consider a suitable hosted sign-in flow or use Cloudflare for the authenticated app.
7. Recheck free-tier limits, inactivity pausing, ownership, and backup responsibilities. Aim for $0 within current allowances; no permanent free-hosting guarantee.
8. If demo records must carry forward, validate an explicitly selected JSON export through controlled migration tooling. Do not accidentally import fictional seeds into the real drive.
9. Configure production Auth URLs, deploy, verify on two devices, and run a small real pilot.

Vercel remains an optional later frontend host, subject to current personal/noncommercial Hobby eligibility. It can retain the same Supabase project and data. No hosting choice or migration is part of demo delivery.

## 18. References for later implementation

These are Phase 2 references; no platform setup is required for the demo.

- GitHub Pages: https://docs.github.com/en/pages/quickstart
- GitHub Pages usage guidance: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Cloudflare static HTML: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- Supabase: https://supabase.com/
- Supabase pricing: https://supabase.com/pricing
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase email restrictions: https://supabase.com/docs/guides/auth/auth-smtp
- Vercel Hobby: https://vercel.com/docs/plans/hobby
