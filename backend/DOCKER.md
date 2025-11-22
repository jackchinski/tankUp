# Docker Setup Guide

This guide explains how to run the Gas Fountain backend with Docker Compose.

## Quick Start

```bash
# Start all services (database + backend)
docker-compose up

# Or run in detached mode (background)
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Stop services
docker-compose down

# Stop and remove volumes (clears database data)
docker-compose down -v
```

## Services

### PostgreSQL Database
- **Container**: `gas-fountain-db`
- **Port**: `5432` (mapped to host)
- **Database**: `gasfountain`
- **User**: `gasfountain`
- **Password**: `gasfountain123` (default, change in `.env`)

### Backend API
- **Container**: `gas-fountain-backend`
- **Port**: `3000` (mapped to host)
- **URL**: `http://localhost:3000`

## Environment Variables

Create a `.env` file in the backend directory to customize settings:

```env
# Database
DB_USER=gasfountain
DB_PASSWORD=your-secure-password
DB_NAME=gasfountain
DB_PORT=5432

# Backend
PORT=3000
NODE_ENV=development
INDEXER_SECRET=your-secret-key
```

## Database Persistence

Data is persisted in a Docker volume named `postgres_data`. To completely reset:

```bash
docker-compose down -v
docker-compose up
```

## Connecting to Database

From your host machine:

```bash
psql -h localhost -p 5432 -U gasfountain -d gasfountain
```

Or from within the Docker network:

```bash
docker-compose exec postgres psql -U gasfountain -d gasfountain
```

## Troubleshooting

### Backend can't connect to database
- Ensure PostgreSQL container is healthy: `docker-compose ps`
- Check database logs: `docker-compose logs postgres`
- Verify environment variables match in both services

### Port already in use
- Change `PORT` in `.env` or `docker-compose.yml`
- Change `DB_PORT` if 5432 is taken

### Database schema not initialized
- Check `scripts/init-db.sql` is mounted correctly
- View PostgreSQL logs: `docker-compose logs postgres`
- Manually run: `docker-compose exec postgres psql -U gasfountain -d gasfountain -f /docker-entrypoint-initdb.d/init-db.sql`

## Development Workflow

For development with hot reload:

```bash
# Start services
docker-compose up

# In another terminal, make code changes
# The backend will auto-reload (tsx watch)
```

For production builds:

```bash
# Build and start
docker-compose up --build

# Or build separately
docker-compose build backend
docker-compose up
```

