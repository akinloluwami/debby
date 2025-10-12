FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy all package files from monorepo
COPY package*.json ./
COPY turbo.json ./
COPY apps/server/package*.json ./apps/server/
COPY apps/web/package*.json ./apps/web/
COPY packages/api/package*.json ./packages/api/

# Install all dependencies including optional ones properly
RUN npm ci --legacy-peer-deps

# Rebuild better-sqlite3 for Alpine Linux
RUN npm rebuild better-sqlite3

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build only the API package (not the server, we'll run it with tsx)
RUN cd packages/api && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install build dependencies and tsx
RUN apk add --no-cache python3 make g++
RUN npm install -g tsx

# Create data directory
RUN mkdir -p /app/data

# Copy necessary files - including source code for both server and API
COPY --from=builder /app/packages/api/src ./packages/api/src
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/apps/server/src ./apps/server/src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/server/package*.json ./apps/server/
COPY --from=builder /app/apps/server/tsconfig.json ./apps/server/
COPY --from=builder /app/packages/api/package*.json ./packages/api/
COPY --from=builder /app/packages/api/tsconfig.json ./packages/api/
COPY --from=builder /app/tsconfig.base.json ./

# Rebuild better-sqlite3 for the final runtime environment
RUN npm rebuild better-sqlite3

EXPOSE 3000

CMD ["tsx", "apps/server/src/index.ts"]
