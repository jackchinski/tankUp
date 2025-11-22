#!/bin/sh
# Migration script for Prisma
# This script runs Prisma migrations

set -e

echo "🔄 Running Prisma migrations..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🚀 Deploying migrations..."
npx prisma migrate deploy

echo "✅ Migrations completed successfully"

