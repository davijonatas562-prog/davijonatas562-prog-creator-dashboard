#!/usr/bin/env bash
# Aplica as migrations num Postgres temporário (com stub do Supabase) e roda os testes de RLS.
# Requer binários do PostgreSQL (initdb/pg_ctl/psql). Uso: npm run test:db
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
RUN_AS=""
if [ "$(id -u)" = "0" ]; then chown -R postgres "$TMP" 2>/dev/null; RUN_AS="runuser -u postgres --"; fi
$RUN_AS "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
$RUN_AS "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=(psql -X -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f tests/supabase_stub.sql
for f in migrations/*.sql; do echo "→ $f"; "${PSQL[@]}" -f "$f"; done
OUT="$("${PSQL[@]}" -f tests/rls_test.sql 2>&1)" || true
echo "$OUT" | grep -E "NOTICE|FALHA" | sed 's/^.*NOTICE:  /  /' || true
echo "$OUT" | grep -q "TODOS OS TESTES PASSARAM" || { echo "$OUT" | tail -20; echo "✗ testes falharam"; exit 1; }
