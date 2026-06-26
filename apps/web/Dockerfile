# syntax=docker/dockerfile:1
# MONOREPO DOCKER PATTERN
# Build context is the monorepo root (set in docker-compose.yml).
# To add a new shared package from /packages/:
#   1. Add its package.json COPY in the deps stage
#   2. Add --workspace=packages/NEW_PACKAGE to npm ci in deps stage
#   3. Add a builder stage for it (copy source + run build)
#   4. Copy its dist/ and package.json in the production stage
# This pattern requires zero Dockerfile changes for business logic updates.

FROM node:20-alpine AS base
WORKDIR /app

# Stage 1: Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/scoring/package.json ./packages/scoring/
RUN npm ci --workspace=@cyberxscore/web --workspace=@cyberxscore/scoring \
    --include-workspace-root

# Stage 2: Build scoring package
FROM deps AS scoring-builder
COPY packages/scoring ./packages/scoring
RUN npm run build --workspace=@cyberxscore/scoring

# Stage 3: Build Next.js app
FROM scoring-builder AS web-builder
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@cyberxscore/web

# Stage 4: Production image (minimal)
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/scoring/package.json ./packages/scoring/
COPY --from=scoring-builder /app/packages/scoring/dist ./packages/scoring/dist
COPY --from=web-builder /app/apps/web/.next ./apps/web/.next
COPY --from=web-builder /app/apps/web/public ./apps/web/public
COPY apps/web/package.json ./apps/web/

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "run", "start"]
