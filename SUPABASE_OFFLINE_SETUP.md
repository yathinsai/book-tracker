# BookTracker — Offline Supabase Setup Pack

Use this document after you create a Supabase project manually. All schema files needed for the first BookTracker shared-pilot foundation are already in this repository; no AI-generated account credentials or online provisioning files are required.

## What is included

| Path | Purpose |
| --- | --- |
| `supabase/config.toml` | Local Supabase configuration, including local Auth URLs |
| `supabase/migrations/20261102000100_initial_booktracker_schema.sql` | Initial tables, constraints, indexes, profiles, RLS, and read policies |
| `supabase/seed.sql` | Intentionally empty development-only seed placeholder |
| `scripts/supabase-doctor.sh` | Read-only local readiness check |
| `config.example.js` | Browser configuration template; no secret values |

The current app is still the localStorage MVP. Applying this migration creates the database foundation only; future migrations will add transactional RPC functions and then connect the UI to Supabase.

## 1. Install tools manually

Install a current Supabase CLI and a Docker-compatible container runtime, then confirm both are available:

```bash
supabase --version
docker --version
```

If you install the CLI as a project dependency, use `npx supabase` in every command below instead of `supabase`. Do **not** run `supabase init`; this repository already contains the required `supabase/` directory and `config.toml`.

From the repository root, run the offline preflight:

```bash
bash scripts/supabase-doctor.sh
```

## 2. Test locally before touching a hosted project

Start the local stack and build the schema from the migration files:

```bash
supabase start
supabase db reset
```

`supabase db reset` recreates the **local** database and runs every migration in timestamp order. It is safe only for local disposable data.

Open the local Studio URL reported by `supabase start`, then confirm these tables exist:

```text
profiles
drives
drive_memberships
locations
inventory_entries
boxes
box_items
shipments
change_events
request_keys
```

For a non-destructive local migration check:

```bash
supabase migration list
```

## 3. Create and connect a hosted development project

1. Create a **development** project in the Supabase Dashboard. Do not start with production data.
2. Save the database password in a password manager.
3. Copy the project reference from the Dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`.
4. Log in and link this repository to that development project:

```bash
supabase login
supabase link --project-ref <development-project-ref>
```

The CLI will request the database password. It does not belong in source files, `config.js`, or browser code.

## 4. Review, then apply the migration remotely

First inspect the planned remote change without applying it:

```bash
supabase db push --dry-run --remote
```

Verify that the output lists only the BookTracker initial migration. Then apply it:

```bash
supabase db push --remote
```

Confirm that local files and the hosted migration history agree:

```bash
supabase migration list --remote
```

Run this check after linking to confirm the basic configuration is present:

```bash
bash scripts/supabase-doctor.sh --remote
```

## 5. Hosted project configuration to do in the Dashboard

Complete these settings manually after the schema deploys:

1. Under **Authentication → URL Configuration**, set the temporary Site URL to `http://127.0.0.1:8080` for local work. Replace it with the production HTTPS URL before inviting users.
2. Under **Authentication**, keep public sign-ups disabled for the invitation-only pilot.
3. Under **Settings → API Keys**, copy only the project URL and publishable key for browser configuration.
4. Do not copy a secret key, legacy `service_role` key, database password, access token, or refresh token into this repository.
5. Create the first organizer using the approved invitation workflow after the membership-management RPC migration exists. The initial migration intentionally has no direct browser write policies.

## 6. Browser and static-build configuration

For the current local MVP, no Supabase browser configuration is required yet. When the Supabase client adapter is added, copy the template:

```bash
cp config.example.js config.js
```

Replace the placeholders with the project URL and the `sb_publishable_...` key only. `config.js` is ignored by Git.

For a Cloudflare Pages build, do not commit `config.js`. Configure these build variables in the hosting dashboard instead:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Then create the deployment bundle:

```bash
npm run build
```

## 7. Rules for every future schema change

1. Create a new migration file locally: `supabase migration new short_description`.
2. Test it with `supabase db reset` locally.
3. Commit the migration file to Git.
4. Review with `supabase db push --dry-run --remote`.
5. Apply it with `supabase db push --remote`.

Do not make persistent schema changes through the hosted SQL Editor or Table Editor after this migration workflow begins. Those changes bypass migration history and make later deployments drift. If an emergency Dashboard change is unavoidable, capture it immediately using `supabase db pull --remote`, review the generated migration, and commit it.

## Safety notes

- Never run `supabase db reset --linked` against any hosted project; it destroys that linked database.
- Do not use `--include-seed` with a production project. `seed.sql` is for local development only.
- Do not load fictional Austin demo data into a real pilot.
- The initial migration enables RLS and read policies but deliberately exposes no direct application write routes. The next migration must add tested transactional RPC functions before the shared UI is enabled.
