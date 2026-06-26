#!/bin/sh
set -e

# Retry migrations until the database is reachable. On a host reboot the
# daemon's restart-policy ignores compose `depends_on` conditions, so the API
# can start before Postgres is ready ("FATAL: the database system is starting
# up"). Without this loop, `set -e` would kill the container permanently.
echo "Running Prisma migrations..."
attempt=1
max_attempts=30
until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Migrations failed after $max_attempts attempts; giving up."
    exit 1
  fi
  echo "Database not ready (attempt $attempt/$max_attempts); retrying in 2s..."
  attempt=$((attempt + 1))
  sleep 2
done

echo "Starting NestJS..."
exec npm run start:prod
