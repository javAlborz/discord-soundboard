#!/bin/bash

echo "Starting Discord Soundboard..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please edit .env file with your Discord bot token before continuing."
    echo "You can get a bot token from: https://discord.com/developers/applications"
    exit 1
fi

# Create sounds directory if it doesn't exist
mkdir -p sounds

# Function to kill background processes
cleanup() {
    echo "Shutting down..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

echo "Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!

echo "Starting frontend..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To start the Discord bot, run in another terminal:"
echo "uv run python bot/main.py"
echo ""
echo "Dashboard will be available at: http://localhost:3000"
echo "API will be available at: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for background processes
wait