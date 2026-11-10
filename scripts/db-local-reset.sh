#!/usr/bin/env bash
# Recreate a local test database from scratch: Supabase shim + all migrations.
# LOCAL TESTING ONLY (plain PostgreSQL, no Docker). In CI the real Supabase
# stack applies the migrations instead (`supabase start` / `supabase db reset`).
#
# Usage: pnpm db:local:reset
# Env:   WOHKAH_TEST_DB (default: wohkah_test), PGHOST/PGPORT/PGUSER as usual.
set -euo pipefail

DB="${WOHKAH_TEST_DB:-wohkah_test}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)

if [[ "$DB" == *prod* ]]; then
  echo "Refusing to reset a database whose name contains 'prod'." >&2
  exit 1
fi

"${PSQL[@]}" -d postgres -c "drop database if exists \"$DB\" with (force);"
"${PSQL[@]}" -d postgres -c "create database \"$DB\";"
"${PSQL[@]}" -d "$DB" -f "$ROOT/tests/db/shim/supabase-shim.sql"

for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "applying $(basename "$f")"
  "${PSQL[@]}" -d "$DB" -f "$f"
done

echo "Local test database '$DB' is ready."
