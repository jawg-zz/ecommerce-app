#!/bin/sh
set -e

echo "Generating Prisma client..."
npx prisma generate

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npx tsx prisma/seed.ts || echo "Seed failed or already seeded"

echo "Starting application..."
exec npm start
