# BookTracker — Supabase Database and Shared Pilot Plan

Version: 1.0 | Date: October 30, 2026 | Project lead: Sai

## 1. Goal

Move the approved BookTracker local MVP from browser-only `localStorage` to a shared Supabase backend without rewriting the existing screens or losing the quantity and shipment safeguards already implemented in `app.js`.

The first cloud release is a small, invitation-only pilot. It supports organizers and volunteers working on the same drive from multiple devices. It does not add public sign-up, donor records, student data, payments, carrier integrations, or production-scale reporting.

## 2. Decisions to confirm before implementation

Confirm these items with the pilot owner before creating production data:

- Who owns the Supabase organization and receives billing, security, and backup notifications?
- Which email addresses are the first organizers, and who may invite volunteers?
- Can volunteers receive, transfer, classify, and pack books, or should some actions be organizer-only?
- Does shipment handoff end the workflow, or must final delivery also be recorded?
- How long must inventory, shipment, and audit history be retained?
- Which Supabase region is closest to the pilot users and acceptable to the partner?
- Is email/password sufficient for the pilot, or is passwordless email preferred?

Recommended pilot roles:

| Role | Access |
| --- | --- |
| Organizer | Manage drive settings, locations, memberships, inventory, boxes, shipments, reversals, and exports |
| Volunteer | View the assigned drive; receive, transfer, classify, and pack books; cannot manage members, change drive settings, ship, or reverse a shipment |

## 3. Create the Supabase account and project

These are one-time owner steps.

1. Go to [supabase.com](https://supabase.com), select **Start your project**, and sign in with the project owner's work email or approved identity provider.
2. Create a Supabase organization for the BookTracker project. Use an organization owned by the nonprofit or project owner rather than a temporary developer account.
3. Add at least one second organization owner or administrator for account recovery.
4. Create a new project named `booktracker-pilot`.
5. Select the agreed region and plan. Start with the smallest plan that meets the pilot's backup and availability requirements.
6. Generate a strong database password and save it in the approved password manager. Do not commit it to Git or place it in browser code.
7. Wait for provisioning to finish, then record the project reference from the Dashboard URL.
8. Open the project's **Connect** dialog and copy the project URL and publishable key. If the project does not yet have a publishable key, create one under **Settings → API Keys**.
9. Never put a secret key or legacy `service_role` key in this frontend. Secret keys bypass Row Level Security and belong only in trusted server-side code.
10. In Auth URL settings, set the local site URL to `http://127.0.0.1:8080` during development. Add the final HTTPS pilot URL to the allowed redirect URLs before deployment.
11. Keep public self-registration disabled for the invitation-only pilot. Configure the email provider and templates before inviting real users.

Create separate Supabase projects for development/staging and production before real data is loaded. Do not test destructive migrations against production.

## 4. Configure local Supabase development

### Prerequisites

- Docker Desktop or another supported Docker runtime for the full local stack
- Supabase CLI
- Node.js only if the team chooses npm for the CLI or JavaScript dependency management

From the `book-tracker` repository root:

```bash
supabase init
supabase login
supabase link --project-ref <development-project-ref>
supabase start
```

This creates a version-controlled `supabase/` directory. Use migrations as the source of truth; do not build the shared schema only by clicking in the Dashboard.

Create the first migration:

```bash
supabase migration new initial_booktracker_schema
```

After writing the migration, verify it from a clean local database:

```bash
supabase db reset
supabase test db
supabase db push --dry-run
```

After review, apply it to the linked development project:

```bash
supabase db push
```

Never run `supabase db reset --linked` against production. It destroys the linked remote database.

## 5. Database schema

Use UUID primary keys with `gen_random_uuid()`, `timestamptz` timestamps in UTC, foreign keys, explicit check constraints, and `created_at` / `updated_at` fields where useful. Retain `drive_id` on operational tables for simple isolation and indexing.

### Identity and access

| Table | Important columns |
| --- | --- |
| `profiles` | `id` referencing `auth.users(id)`, `display_name`, `created_at` |
| `drive_memberships` | `drive_id`, `user_id`, `role` (`organizer` or `volunteer`), `status` (`active` or `inactive`), `created_at`; unique `(drive_id, user_id)` |

### Book drive data

| Table | Important columns and constraints |
| --- | --- |
| `drives` | `id`, `name`, `partner_name`, `guidance_text`, `guidance_url`, optional positive `goal_accepted_quantity`, `destination_description`, `status`, timestamps |
| `locations` | `id`, `drive_id`, `name`, `type` (`collection` or `central`), `active`, timestamps; unique name per drive; enforce one active central location per drive with a partial unique index |
| `inventory_entries` | Existing MVP fields plus `version`, `created_by`, timestamps; positive integer `quantity`; rejection reason required only when decision is `rejected`; origin and current locations must belong to the entry's drive |
| `boxes` | `id`, `drive_id`, `label`, `status` (`open`, `ready`, `shipped`), optional nonnegative `verified_quantity`, optional `shipment_id`, `version`, timestamps; unique label per drive |
| `box_items` | `id`, `drive_id`, `box_id`, `inventory_entry_id`, positive integer `quantity`, timestamps; unique `(box_id, inventory_entry_id)` |
| `shipments` | `id`, `drive_id`, `shipped_date`, `destination`, optional `tracking_reference`, `created_by`, timestamps |
| `change_events` | `id`, `drive_id`, `entity_type`, `entity_id`, `action`, `before_values jsonb`, `after_values jsonb`, `actor_id`, `created_at`; append-only to application users |
| `request_keys` | `drive_id`, `actor_id`, `operation`, `idempotency_key`, `result jsonb`, `created_at`; unique `(actor_id, operation, idempotency_key)` |

Use database constraints or triggers for relationships that normal foreign keys cannot express directly, especially same-drive location references and same-drive box allocations.

### Required indexes

Create indexes for:

- `drive_memberships(user_id)` and `drive_memberships(drive_id, user_id)`
- Every table's `drive_id`
- Inventory filters: origin location, current location, decision, reading level, and `updated_at`
- `box_items(box_id)` and `box_items(inventory_entry_id)`
- `boxes(shipment_id)` and box status per drive
- `shipments(drive_id, shipped_date)`
- `change_events(drive_id, created_at desc)`

## 6. Put business-critical writes in database functions

Do not reproduce the current read-clone-validate-save pattern as several browser requests. Concurrent users could otherwise over-allocate books or edit shipped contents.

Create PostgreSQL functions for these operations and call them through Supabase RPC:

1. `receive_inventory`
2. `update_or_split_inventory`
3. `transfer_inventory`
4. `allocate_inventory_to_box`
5. `remove_inventory_from_box`
6. `verify_box_ready`
7. `confirm_shipment`
8. `reverse_shipment`
9. `import_inventory_rows`

Each function must:

- Require an authenticated drive member with the correct role.
- Validate all inputs and membership inside the transaction.
- Lock affected inventory, box, and shipment rows with `FOR UPDATE` where races are possible.
- Enforce `shipped ≤ packed ≤ accepted ≤ received` and prevent allocation above available quantity.
- Increment row versions when mutable records change.
- Add the matching `change_events` record in the same transaction.
- Accept an idempotency key for retryable create or shipment operations.
- Return the changed records or a clear result object for the UI.

Use `security invoker` by default. If a `security definer` helper is necessary, set an empty or explicit safe `search_path`, fully qualify object names, and grant execution only to the required role.

## 7. Authentication, grants, and Row Level Security

1. Enable Row Level Security on every exposed table.
2. Revoke default privileges from `anon` and `authenticated`, then grant only the operations the app needs.
3. Give `anon` no access to BookTracker tables or functions.
4. Permit an authenticated user to read a drive only when an active `drive_memberships` row exists for `auth.uid()`.
5. Permit organizers to manage drive settings, locations, and memberships for their drives.
6. Permit volunteers only the approved operational RPC calls. Avoid direct table writes when a transaction is required.
7. Allow users to read their own profile; restrict profile changes to safe fields.
8. Make `change_events` append-only through controlled functions; clients may read events only for their drives.
9. Add indexes supporting every membership lookup used in an RLS policy.
10. Test signed-out denial, nonmember denial, cross-drive isolation, volunteer restrictions, organizer access, and expired sessions.

Do not use user-editable Auth metadata to decide authorization. Store roles in `drive_memberships` and evaluate them in policies or protected helper functions.

## 8. Configure this vanilla JavaScript project

Keep the current no-build setup for the pilot unless deployment requirements justify adding a bundler.

1. Load Supabase JavaScript v2 from its official npm package or supported CDN. For the current static app, a pinned CDN version is the smallest change.
2. Add `config.example.js` containing placeholders for the project URL and publishable key.
3. Add the real local `config.js` to `.gitignore`. The publishable key is designed for browser use, but keeping environment-specific values out of source prevents accidental dev/production mix-ups.
4. Load configuration before `app.js`, then initialize one client with `createClient(projectUrl, publishableKey)`.
5. Never expose the database password, secret key, access token, or refresh token in committed files.
6. Add a sign-in screen, sign-out action, session-expired state, and `onAuthStateChange` handling.
7. Replace hard-coded `ACTIVE_DRIVE_ID` with the signed-in user's selected membership.
8. Preserve the existing repository interface, but add a `createSupabaseRepository(client)` adapter. Keep the local repository available only as an explicit demo mode during migration.
9. Load drive state from normalized tables and map it to the current rendering model. Route all critical writes through the RPC functions above.
10. Replace the “stored only in this browser” banner with connection, sync, and signed-in-user status.
11. Keep unsaved form values when a network request fails, disable duplicate submissions, and send a new idempotency key for each intentional action.
12. Add Realtime only after normal reload-and-refresh behavior is correct. If added, subscribe by drive and refetch authoritative rows after change notifications.

Suggested local-only configuration shape:

```js
window.BOOKTRACKER_CONFIG = {
  supabaseUrl: 'https://<project-ref>.supabase.co',
  supabasePublishableKey: 'sb_publishable_...'
};
```

For production static hosting, generate the equivalent runtime configuration during deployment or use the host's environment-variable mechanism. Do not commit production configuration by default.

## 9. Data migration

1. Export and archive a JSON backup from the current local MVP.
2. Write a validated migration script that accepts the existing schema version and maps IDs and relationships into the new tables.
3. Create the pilot drive and locations first, then entries, boxes, shipments, box items, and history in dependency order.
4. Import only approved real pilot data. Do not copy fictional Austin sample records into production.
5. Run reconciliation queries before and after import for received, pending, accepted, rejected, packed, and shipped counts.
6. Save the import report with source checksum, row counts, book totals, warnings, operator, and timestamp.
7. Keep the source backup read-only until the pilot owner signs off.

## 10. Test plan and acceptance gates

The cloud pilot is ready only when all of these pass:

- A signed-out browser cannot read or write any drive data.
- A member of Drive A cannot read identifiers or records from Drive B.
- A volunteer cannot manage members, change drive setup, ship, or reverse shipments.
- Two devices cannot allocate more copies than an inventory entry contains.
- Two rapid submissions with the same idempotency key create one result.
- A stale version produces a visible conflict instead of silently overwriting data.
- Shipped box contents remain locked until an authorized, logged reversal.
- Split and transfer operations preserve total received quantity and provenance.
- Dashboard totals satisfy all current reconciliation invariants after every workflow.
- Session expiry returns the user to sign-in without erasing unsaved form input.
- CSV/JSON exports escape spreadsheet formulas and include only the user's drive.
- Migrations rebuild a clean local database, and RLS tests run automatically.
- Backup and restore procedures are tested before real pilot data is entered.

## 11. Delivery sequence

### Phase 5A — ownership and schema

- Confirm roles, workflow, data owner, retention, region, and recovery owner.
- Create development and production Supabase projects.
- Commit CLI configuration, migrations, constraints, indexes, and nonproduction seed data.

Exit gate: a clean local reset produces the complete schema and passes database tests.

### Phase 5B — authentication and isolation

- Add profiles, drive memberships, invitation workflow, grants, and RLS.
- Add automated tests for anonymous denial, role permissions, and cross-drive isolation.

Exit gate: no table is exposed without tested RLS and least-privilege grants.

### Phase 5C — transactional workflows

- Implement and test inventory, packing, shipment, reversal, audit, version, and idempotency functions.
- Test concurrent operations from two sessions.

Exit gate: database transactions enforce the existing MVP invariants under concurrency.

### Phase 5D — frontend adapter

- Add Supabase configuration and Auth UI.
- Implement the Supabase repository adapter and connect current screens to it.
- Retain local demo mode temporarily for comparison and recovery.

Exit gate: the full walkthrough works across two browsers and survives reload and session renewal.

### Phase 5E — pilot and production handoff

- Deploy to an HTTPS staging URL and configure Auth redirects.
- Import approved data through the validated migration tool.
- Complete organizer walkthrough, backup/restore drill, monitoring, and feedback capture.
- Promote reviewed migrations and configuration to production.

Exit gate: the owner accepts counts, permissions, recovery steps, and operating documentation.

## 12. Recommended repository changes during implementation

```text
book-tracker/
├── index.html
├── styles.css
├── app.js
├── config.example.js
├── config.js                 # local only; ignored by Git
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   ├── seed.sql              # fictional development data only
│   └── tests/
└── scripts/
    └── import-local-backup.* # validated one-time migration tool
```

Update `README.md` with local Supabase prerequisites, startup commands, configuration, test commands, and the difference between local demo mode and shared pilot mode.

## 13. Operational safeguards

- Enable multi-factor authentication for Supabase organization owners.
- Keep at least two owners and document account recovery.
- Review Supabase security and database advisors before launch.
- Turn on the required backup capability for the selected plan and test restoration.
- Define who reviews Auth, database, and application logs after an incident.
- Rotate a key immediately if a secret key is exposed; a publishable key is not a substitute for RLS.
- Store no donor names, student IDs, home addresses, or recipient-child data unless a later approved requirement includes a privacy review.
- Start with a development project, a staging walkthrough, and a small production pilot; do not treat the local fictional seed as production data.

## 14. Register and deploy on free hosting

Recommended host for this static pilot: **Cloudflare Pages Free**. It provides an HTTPS `pages.dev` address, Git-based automatic deployments, branch previews, and does not require a JavaScript framework. Supabase remains the database and authentication service; Cloudflare hosts only the frontend files.

Free-plan limits and product terms can change, so review the current Cloudflare Pages limits before the production handoff. A custom domain is optional and may have a separate registration cost even when hosting is free.

### 14.1 Create the required accounts

1. Create a [GitHub](https://github.com) account if the project owner does not already have one.
2. Verify the email address and enable multi-factor authentication.
3. Create a private GitHub repository named `book-tracker` under the project owner's account or organization.
4. Push the reviewed BookTracker source to the repository. Confirm that `config.js`, database passwords, Supabase secret keys, and local environment files are ignored and absent from Git history.
5. Create a [Cloudflare](https://dash.cloudflare.com/sign-up) account using the project owner's email.
6. Verify the account email, enable multi-factor authentication, and add a second administrator when the project has another trusted owner.

### 14.2 Add a small static build step

The current project runs directly from its source directory and has no build command. Before Git deployment, add a small Node.js build script so hosting configuration can be supplied without committing environment-specific values.

The build script should:

1. Delete and recreate a repository-local `dist/` directory.
2. Copy `index.html`, `styles.css`, `app.js`, and any required static assets into `dist/`.
3. Read `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the build environment.
4. Stop with a clear error when either value is missing.
5. Generate `dist/config.js` using those two values.
6. Never accept or write `SUPABASE_SECRET_KEY`, `service_role`, or the database password.

Add `dist/` and the local `config.js` to `.gitignore`. Add this script to `package.json`:

```json
{
  "private": true,
  "scripts": {
    "build": "node scripts/build-static.mjs"
  }
}
```

Test the production-style output locally:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
npm run build
python3 -m http.server 8081 --directory dist --bind 127.0.0.1
```

Open `http://127.0.0.1:8081`, sign in, and complete the core inventory and box workflow. The publishable key is safe to include in browser output; security still depends on tested Row Level Security. Never use a secret key to make browser requests work.

### 14.3 Connect the Git repository to Cloudflare Pages

1. Sign in to the Cloudflare Dashboard.
2. Open **Workers & Pages**.
3. Select **Create application → Pages → Connect to Git**.
4. Choose GitHub, authorize the Cloudflare application, and grant it access only to the `book-tracker` repository when possible.
5. Select the repository and choose **Begin setup**.
6. Set the project name to `book-tracker` or another available name. Cloudflare will create an address similar to `https://book-tracker.pages.dev`.
7. Select the reviewed production branch, normally `main`.
8. Use these build settings:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Root directory | Repository root; use `book-tracker` only if it is inside a larger repository |
| Build command | `npm run build` |
| Build output directory | `dist` |

9. Add production environment variables in the Pages build settings:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | `https://<production-project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | The production `sb_publishable_...` key |

10. Do not add a Supabase secret key or database password.
11. Select **Save and Deploy**.
12. Review the build log, wait for the deployment to succeed, and open the generated HTTPS URL.

Every later push to `main` will build and deploy production automatically. Other configured branches can receive preview URLs. Use a separate development Supabase project for preview deployments; do not point unreviewed branch previews at production data.

### 14.4 Connect the deployed URL to Supabase Auth

After the first successful deployment:

1. Copy the exact Cloudflare production URL, including `https://`.
2. In the production Supabase Dashboard, open **Authentication → URL Configuration**.
3. Set **Site URL** to the exact production URL, for example `https://book-tracker.pages.dev`.
4. Add the exact production URL and required callback path to **Redirect URLs**.
5. Retain the exact local development redirect, such as `http://127.0.0.1:8080/**`, only if developers still need it.
6. If branch previews will test authentication, add a narrowly scoped preview wildcard during development. Prefer exact URLs for production and remove broad wildcards after testing.
7. If passwordless email uses a `redirectTo` value, verify that the email template uses the intended redirect variable and that the generated link returns to the hosted app.
8. Send an invitation to a test organizer and volunteer, then test confirmation, sign-in, sign-out, password recovery, and session expiry from the deployed site.

### 14.5 Verify the hosted release

Run this checklist before sharing the URL:

- The site loads over HTTPS with no missing JavaScript or CSS files.
- Browser developer tools show no secret key, database password, or privileged token in source files or network requests.
- Signed-out users cannot read BookTracker data.
- Organizer and volunteer permissions behave as defined in the RLS tests.
- Refreshing a nested authentication or callback URL returns to the app correctly.
- Two browsers see committed changes and cannot over-allocate the same inventory.
- The Tailwind CDN failure fallback remains usable.
- Inventory and backup downloads work from the hosted origin.
- Mobile layout, keyboard navigation, manifests, and browser printing still work.
- Supabase Site URL and redirect URLs point to production rather than localhost.

### 14.6 Updates, rollback, and optional custom domain

- Deploy changes through a reviewed branch or pull request, test its preview, and merge to `main` only after approval.
- If a release fails, use Cloudflare Pages deployment history to restore the last known-good frontend deployment. A frontend rollback does not reverse database migrations.
- Apply backward-compatible database migrations before frontend code that depends on them. Remove old database behavior only after the new frontend is deployed and verified.
- To use a custom domain, buy or use a domain controlled by the project owner, add it under the Pages project's custom-domain settings, follow the DNS verification steps, and then replace the Supabase Site URL and redirect entries with the final HTTPS domain.
- Keep the `pages.dev` address documented as a recovery address unless the owner decides to disable its use.

### 14.7 Free-hosting exit gate

Hosting setup is complete when a push to the production branch creates a successful reproducible build, the HTTPS site connects to the production Supabase project using only a publishable key, authentication redirects return to the correct domain, authorization tests pass from the hosted origin, and the owner can locate deployment logs and restore the previous frontend release.

## 15. Definition of done

The Supabase phase is complete when an invited organizer and volunteer can sign in on separate devices, see only their assigned drive, complete their authorized workflow, and maintain correct reconciled totals during concurrent use. The schema is reproducible from migrations, security is covered by automated RLS tests, critical writes are transactional and audited, recovery has been tested, and no privileged credential is present in browser code or Git history.
