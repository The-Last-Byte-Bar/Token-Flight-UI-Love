# Docker Setup for Token Flight UI

This project is containerized using Docker and can be run using Docker Compose. Below are instructions on how to build and run the application in different environments.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Production Setup

To build and run the application in production mode:

```bash
# Build and start the containers
docker-compose up --build

# To run in detached mode (background)
docker-compose up --build -d

# To stop the containers
docker-compose down
```

This will:
- Build the frontend and serve it with Nginx on port 80
- Build the backend and run it on port 3002 (mapped to internal port 3000)
- Configure Nginx to proxy API requests to the backend

## Development Setup

For development with hot reloading:

```bash
# Build and start the development containers
docker-compose -f docker-compose.dev.yml up --build

# To run in detached mode (background)
docker-compose -f docker-compose.dev.yml up --build -d

# To stop the containers
docker-compose -f docker-compose.dev.yml down
```

This will:
- Start the frontend dev server with hot reloading on port 8081 (mapped to internal port 8080)
- Start the backend with nodemon for auto-reloading on port 3002 (mapped to internal port 3000)
- Mount the source code directories as volumes for live editing

## TypeScript Fixes

The project includes fixes for TypeScript compilation errors:

1. A global type declaration file is included at `backend/src/types/global.d.ts` to provide missing types
2. The backend Dockerfile includes a script to modify the TypeScript configuration for builds
3. Development mode uses ts-node with the `--transpile-only` flag to skip type checking
4. A custom script is used in development to handle browser-specific objects in a Node.js environment

## Helper Script

A helper script is included for easier Docker operations:

```bash
# Run the helper script (make it executable first with chmod +x docker-up.sh)
./docker-up.sh --help  # Show help
./docker-up.sh --prod --build  # Build and run in production mode
./docker-up.sh --dev  # Run in development mode
```

## Accessing the Application

- Production: http://localhost
- Development: http://localhost:8081

The backend API is available at:
- Production: http://localhost/api
- Development: http://localhost:3002

## Environment Variables

You can modify environment variables in the `docker-compose.yml` or `docker-compose.dev.yml` files.

### Frontend Environment Variables
- `NODE_ENV`: Set to `production` or `development`
- `VITE_API_URL`: URL for the backend API

### Backend Environment Variables
- `NODE_ENV`: Set to `production` or `development`
- `PORT`: Port the backend server runs on
- `ERGO_PLATFORM_API_URL`: URL for the Ergo Platform API

## Troubleshooting

If you encounter any issues:

1. Check container logs:
   ```bash
   docker-compose logs frontend
   docker-compose logs backend
   ```

2. Rebuild the containers:
   ```bash
   docker-compose down
   docker-compose up --build
   ```

3. Check if ports are already in use:
   ```bash
   lsof -i :80
   lsof -i :3002
   lsof -i :8081
   ```

4. If TypeScript errors persist:
   ```bash
   # The development environment uses ts-node with --transpile-only to skip type checking
   # For production builds, modify backend/docker-ts-config.js to adjust TypeScript configuration
   ``` 