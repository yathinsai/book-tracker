# Node.js connectors

These are placeholders for trusted Node.js code. The existing `index.html` and `app.js` are static browser files and must not import `createServerSupabaseConnector`.

## Configure

```bash
cp .env.example .env
npm install @supabase/supabase-js
```

Populate `.env` with project values. On Node.js 20+, run a local Node script with:

```bash
node --env-file=.env your-script.mjs
```

## Choose the correct connector

| Connector | Key | Intended use |
| --- | --- | --- |
| `createPublicSupabaseConnector` | Publishable key | User-scoped requests protected by Auth and RLS |
| `createServerSupabaseConnector` | Secret key | Trusted backend-only maintenance or administrative code |

The server connector bypasses RLS. It is deliberately not wired into the frontend or hosting build.
