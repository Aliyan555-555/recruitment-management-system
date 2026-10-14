#!/bin/sh
# Resets the LOCAL e2e database to the pristine seed snapshot (data only, so a running app keeps working), then applies demo prep.
cd "$(dirname "$0")"
docker exec -i rms-e2e-pg psql -U e2e -d rms_e2e -q < truncate.sql 2>/dev/null
docker exec -i rms-e2e-pg pg_restore -U e2e -d rms_e2e --data-only --disable-triggers --no-owner < db/baseline.dump 2>&1 | grep -v "prisma_migrations|duplicate key|DETAIL|CONTEXT|errors ignored" | head -5
docker exec -i rms-e2e-pg psql -U e2e -d rms_e2e -q < prep.sql
echo "db reset"
