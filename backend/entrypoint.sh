#!/bin/sh
set -e

echo "[entrypoint] applying database migrations..."
npx prisma migrate deploy

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "[entrypoint] seeding demo data (SEED_ON_START=true)..."
  node dist/prisma/seed.js
fi

echo "[entrypoint] starting server..."
exec node dist/src/server.js
