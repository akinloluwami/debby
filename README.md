# 🐳 Debby - Self-Hosted Database Manager

Debby is a powerful, self-hosted database management platform that lets you spin up and manage multiple database instances (PostgreSQL, MySQL, MongoDB) using Docker through an intuitive web dashboard.

## ✨ Features

- 🔐 **Secure Authentication** - Master password protection with bcrypt hashing
- 🐘 **Multiple Database Types** - PostgreSQL, MySQL, and MongoDB support
- 🚀 **Easy Management** - Start, stop, and delete database instances with a click
- 🎨 **Modern UI** - Clean, responsive interface built with React and Tailwind CSS
- 🐳 **Docker-Powered** - Leverages Docker for isolated database instances
- 📊 **Real-time Status** - Monitor the status of all your databases
- 🔄 **Auto-Sync** - Automatically syncs with Docker Desktop/CLI changes every 5 seconds
- 🎯 **Auto Port Assignment** - Automatically finds and assigns available ports
- 📋 **Database Details** - Comprehensive details page with connection info, logs, and settings
- 📝 **Copy to Clipboard** - One-click copy for connection strings and credentials
- 🌐 **Full-Stack TypeScript** - Type-safe from frontend to backend

## 🛠️ Tech Stack

### Backend
- **Hono** - Fast web framework
- **tRPC** - End-to-end typesafe APIs
- **Dockerode** - Docker Engine API client
- **bcrypt** - Password hashing

### Frontend
- **React 19** - UI library
- **TanStack Router** - Type-safe routing
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - UI components

## 📋 Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 11+

## 🚀 Quick Start

### Development Mode

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd debby
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Server on http://localhost:3000
   - Web app on http://localhost:3001

5. **First-time setup**
   - Navigate to http://localhost:3001
   - Set your master password
   - Start creating database instances!

### Production Deployment with Docker Compose

1. **Build and start the services**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Web Dashboard: http://localhost:3001
   - API Server: http://localhost:3000

3. **View logs**
   ```bash
   docker-compose logs -f
   ```

4. **Stop the services**
   ```bash
   docker-compose down
   ```

### Example: Starting with Sample Database

To start Debby with an example PostgreSQL database:

```bash
docker-compose --profile example up -d
```

## 📁 Project Structure

```
debby/
├── apps/
│   ├── server/          # Hono backend server
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── Dockerfile
│   └── web/             # React frontend
│       ├── src/
│       │   ├── components/
│       │   ├── routes/
│       │   ├── stores/
│       │   └── utils/
│       ├── Dockerfile
│       └── nginx.conf
├── packages/
│   └── api/             # Shared tRPC API
│       ├── src/
│       │   ├── routers/
│       │   ├── utils/
│       │   ├── context.ts
│       │   ├── index.ts
│       │   └── types.ts
│       └── package.json
├── data/                # Persistent data (auto-generated)
├── docker-compose.yml
└── README.md
```

## 🔧 API Endpoints

The backend exposes the following tRPC routes:

### Setup
- `setup.isConfigured` - Check if master password is configured
- `setup.setPassword` - Set master password (first-time only)
- `setup.verifyPassword` - Verify master password

### Databases
- `databases.list` - Get all database instances
- `databases.getById` - Get specific database
- `databases.create` - Create new database (auto-assigns port)
- `databases.update` - Update database configuration
- `databases.delete` - Delete database and container

### Instances
- `instances.start` - Start a database container
- `instances.stop` - Stop a database container
- `instances.status` - Get container status
- `instances.list` - List all managed containers
- `instances.syncAll` - Sync all databases with Docker (auto-called every 5s)

## 🎯 Usage Guide

### Creating a Database

1. Click "New Database" in the dashboard
2. Fill in the details:
   - **Name**: Friendly name for your database
   - **Type**: PostgreSQL, MySQL, or MongoDB
   - **Username**: Database admin username
   - **Password**: Database admin password
3. Click "Create Database"

Debby will automatically:
- Find and assign an available port
- Pull the appropriate Docker image
- Create and configure the container
- Start the database instance
- Make it accessible on the auto-assigned port

### Managing Databases

- **Start**: Click the "Start" button to start a stopped container
- **Stop**: Click the "Stop" button to stop a running container
- **Delete**: Click the "Delete" button to remove the database and container
- **Auto-Sync**: The UI automatically syncs with Docker every 5 seconds, detecting any changes made via Docker Desktop or CLI

### Connecting to Your Databases

Once a database is running, check the port displayed on the database card and connect using standard client tools:

**PostgreSQL**
```bash
psql -h localhost -p <assigned_port> -U your_username -d your_database
```

**MySQL**
```bash
mysql -h localhost -P <assigned_port> -u your_username -p
```

**MongoDB**
```bash
mongosh mongodb://your_username:your_password@localhost:<assigned_port>
```

## 🔒 Security Notes

- Master password is hashed with bcrypt (10 rounds)
- Password hash is stored in `data/master-password.json`
- Database credentials are stored in `data/databases.json`
- **Important**: Keep the `data/` directory secure and backed up
- For production, consider:
  - Setting up HTTPS
  - Using stronger passwords
  - Restricting network access
  - Regular backups of the data directory

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3001` |
| `DATA_DIR` | Data storage directory | `./data` |
| `DOCKER_SOCKET` | Docker socket path | `/var/run/docker.sock` |

## 🧪 Development

### Run specific workspace
```bash
npm run dev:server   # Backend only
npm run dev:web      # Frontend only
```

### Build for production
```bash
npm run build
```

### Type checking
```bash
npm run check-types
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project however you like!

## 🙏 Acknowledgments

- Built with [Hono](https://hono.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Docker management via [Dockerode](https://github.com/apocas/dockerode)
- Type-safe APIs with [tRPC](https://trpc.io/)

---

Made with ❤️ for the self-hosting community
