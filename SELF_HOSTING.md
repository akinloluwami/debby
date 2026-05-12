# Self-Hosting Guide for Debby

This guide will help you self-host Debby using Docker Compose.

## Prerequisites

- Docker Desktop or Docker Engine installed
- Docker Compose v2.0 or higher
- Ports 4366 and 4466 available on your host machine

## Quick Start

1. **Clone the repository** (or download the source code):

   ```bash
   git clone https://github.com/akinloluwami/debby
   cd debby
   ```

2. **Start the application**:

   ```bash
   docker compose up -d
   ```

   This will:
   - Build the server and web containers
   - Start the backend API server on port 4466
   - Start the web frontend on port 4366
   - Create a persistent volume for data storage

3. **Access the application**:
   - Web Interface: http://localhost:4366
   - API Server: http://localhost:4466

## Configuration

### Environment Variables

The default configuration works out of the box, but you can customize it by creating a `.env` file:

```env
# CORS origin for the API. Use commas for multiple origins.
CORS_ORIGIN=http://localhost:4366

# Required in production. Use a random value of at least 32 characters.
APP_SECRET=change-me-to-a-random-32-character-minimum-secret

# Data directory inside the container
DATA_DIR=/app/data

# Server port
PORT=4466
```

### Custom Ports

To use different ports, edit the `docker-compose.yml` file:

```yaml
services:
  server:
    ports:
      - "YOUR_PORT:4466" # Change YOUR_PORT to your desired port

  web:
    ports:
      - "YOUR_WEB_PORT:4366" # Change YOUR_WEB_PORT to your desired port
```

Don't forget to update the `CORS_ORIGIN` environment variable if you change the web port.
