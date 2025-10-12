# Self-Hosting Guide for Debby

This guide will help you self-host Debby using Docker Compose.

## Prerequisites

- Docker Desktop or Docker Engine installed
- Docker Compose v2.0 or higher
- At least 2GB of free RAM
- Ports 3000 and 3001 available on your host machine

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
   - Start the backend API server on port 3000
   - Start the web frontend on port 3001
   - Create a persistent volume for data storage

3. **Access the application**:
   - Web Interface: http://localhost:3001
   - API Server: http://localhost:3000

## Configuration

### Environment Variables

The default configuration works out of the box, but you can customize it by creating a `.env` file:

```env
# CORS origin for the API (defaults to http://localhost:3001)
CORS_ORIGIN=http://localhost:3001

# Data directory inside the container
DATA_DIR=/app/data

# Server port (if you want to change it, also update docker-compose.yml)
PORT=3000
```

### Custom Ports

To use different ports, edit the `docker-compose.yml` file:

```yaml
services:
  server:
    ports:
      - "YOUR_PORT:3000" # Change YOUR_PORT to your desired port

  web:
    ports:
      - "YOUR_WEB_PORT:80" # Change YOUR_WEB_PORT to your desired port
```

Don't forget to update the `CORS_ORIGIN` environment variable if you change the web port.
