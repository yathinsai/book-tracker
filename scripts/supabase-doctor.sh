#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed or is not on PATH. Install it manually, then rerun this script." >&2
  exit 1
fi

required_paths=(
  "supabase/config.toml"
  "supabase/migrations/20261102000100_initial_booktracker_schema.sql"
  "supabase/seed.sql"
)

for required_path in "${required_paths[@]}"; do
  if [[ ! -f "$required_path" ]]; then
    echo "Missing required file: $required_path" >&2
    exit 1
  fi
done

if [[ "${1:-}" == "--remote" ]]; then
  echo "Checking linked remote migration history (read-only)…"
  supabase migration list --remote
else
  echo "Supabase CLI: $(supabase --version)"
  echo "Migration files found:"
  find supabase/migrations -maxdepth 1 -type f -name '*.sql' -print | sort
  echo "Offline preflight passed. Run 'supabase start' followed by 'supabase db reset' to test locally."
fi
