FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy all package files from monorepo
COPY package*.json ./
COPY turbo.json ./
COPY apps/server/package*.json ./apps/server/
COPY apps/web/package*.json ./apps/web/
COPY packages/api/package*.json ./packages/api/

# Install all dependencies including optional ones properly
RUN npm ci --legacy-peer-deps

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build web app
WORKDIR /app/apps/web
RUN npm run build

# Production image with nginx
FROM nginx:alpine AS runner

# Copy built files
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
