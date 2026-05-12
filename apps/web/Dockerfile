FROM oven/bun:1.3.13-alpine AS build

WORKDIR /app

ARG VITE_API_URL=http://localhost:4466
ENV VITE_API_URL=$VITE_API_URL

COPY package.json bun.lock* ./
COPY apps/web/package.json apps/web/package.json

RUN bun install --frozen-lockfile

COPY apps/web apps/web

WORKDIR /app/apps/web
RUN bun run build

FROM oven/bun:1.3.13-alpine

WORKDIR /app

RUN bun add -g serve

COPY --from=build /app/apps/web/dist ./dist

EXPOSE 4366

CMD ["serve", "-s", "dist", "-l", "4366"]
