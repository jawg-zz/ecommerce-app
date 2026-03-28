#!/bin/sh
set -e

echo "Generating Prisma client..."
npx prisma generate

echo "Pushing database schema..."
npx prisma db push --accept-data-loss

echo "Seeding database..."
npx tsx prisma/seed.ts || echo "Seed failed or already seeded"

echo "Starting application..."
exec node server.js
