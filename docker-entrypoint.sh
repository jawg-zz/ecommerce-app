#!/bin/sh
set -e

echo "Running database migrations..."
npm run prisma:generate
npx --no-install prisma migrate deploy

echo "Starting application..."
exec node server.js
