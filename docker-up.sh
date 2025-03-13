#!/bin/bash

# Help function
show_help() {
  echo "Docker Helper Script for Token Flight UI"
  echo ""
  echo "Usage: ./docker-up.sh [options]"
  echo ""
  echo "Options:"
  echo "  --help, -h     Show this help message"
  echo "  --prod, -p     Run in production mode (default)"
  echo "  --dev, -d      Run in development mode"
  echo "  --build, -b    Force rebuild containers (default: false)"
  echo "  --detach       Run in detached mode (background)"
  echo "  --down         Stop and remove containers"
  echo ""
  echo "Examples:"
  echo "  ./docker-up.sh --prod --build      # Build and run in production mode"
  echo "  ./docker-up.sh --dev               # Run in development mode"
  echo "  ./docker-up.sh --down              # Stop and remove containers"
}

# Default values
MODE="prod"
BUILD=false
DETACH=""
DOWN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      show_help
      exit 0
      ;;
    --prod|-p)
      MODE="prod"
      shift
      ;;
    --dev|-d)
      MODE="dev"
      shift
      ;;
    --build|-b)
      BUILD=true
      shift
      ;;
    --detach)
      DETACH="-d"
      shift
      ;;
    --down)
      DOWN=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Set the compose file based on mode
if [ "$MODE" == "dev" ]; then
  COMPOSE_FILE="docker-compose.dev.yml"
else
  COMPOSE_FILE="docker-compose.yml"
fi

# Handle stop and remove
if [ "$DOWN" = true ]; then
  echo "📦 Stopping and removing containers using $COMPOSE_FILE..."
  docker-compose -f $COMPOSE_FILE down
  exit 0
fi

# Build and run command
BUILD_FLAG=""
if [ "$BUILD" = true ]; then
  BUILD_FLAG="--build"
fi

echo "📦 Starting containers in $MODE mode..."
if [ "$MODE" == "dev" ]; then
  echo "🔧 Development mode: Code changes will be automatically reloaded"
else
  echo "🚀 Production mode: Optimized build"
fi

docker-compose -f $COMPOSE_FILE up $BUILD_FLAG $DETACH

# Provide helpful message after starting
if [ -z "$DETACH" ]; then
  echo "💡 Press Ctrl+C to stop the containers"
else
  if [ "$MODE" == "dev" ]; then
    echo "🌐 Frontend available at: http://localhost:5173"
    echo "🔌 Backend API available at: http://localhost:3000"
  else
    echo "🌐 Application available at: http://localhost"
    echo "🔌 Backend API available through: http://localhost/api"
  fi
  echo "📋 To see logs: docker-compose -f $COMPOSE_FILE logs -f"
  echo "🛑 To stop: ./docker-up.sh --down"
fi 