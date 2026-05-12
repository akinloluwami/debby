FROM oven/bun:1.3.13-alpine

WORKDIR /app

COPY package.json bun.lock* ./
COPY apps/server/package.json apps/server/package.json

RUN bun install --frozen-lockfile

COPY apps/server apps/server

WORKDIR /app/apps/server

EXPOSE 4466

CMD ["bun", "run", "start"]
