#!/bin/bash

# Pathfinder Development Server Startup Script
# This script checks for occupied ports, cleans them up, and starts both servers

echo "🚀 Starting Pathfinder Development Environment..."

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on a port
kill_port() {
    local port=$1
    echo "🔍 Checking port $port..."
    if check_port $port; then
        echo "⚠️  Port $port is occupied. Killing process..."
        lsof -ti:$port | xargs kill -9 2>/dev/null
        sleep 2
        if check_port $port; then
            echo "❌ Failed to kill process on port $port"
            return 1
        else
            echo "✅ Successfully freed port $port"
        fi
    else
        echo "✅ Port $port is free"
    fi
}

# Function to start backend server
start_backend() {
    echo "🔧 Starting backend server..."
    cd server
    
    # Clean install and rebuild for current Node.js version
    echo "📦 Installing dependencies..."
    npm install --silent
    
    echo "🔧 Rebuilding native modules for current Node.js version..."
    npm rebuild better-sqlite3 --silent
    
    echo "🚀 Starting backend server..."
    npm start &
    BACKEND_PID=$!
    cd ..
    echo "✅ Backend server started (PID: $BACKEND_PID)"
}

# Function to start frontend server
start_frontend() {
    echo "🎨 Starting frontend server..."
    npm install --silent
    npm run dev &
    FRONTEND_PID=$!
    echo "✅ Frontend server started (PID: $FRONTEND_PID)"
}

# Function to wait for servers to be ready
wait_for_servers() {
    echo "⏳ Waiting for servers to be ready..."
    
    # Wait for backend
    local backend_ready=false
    for i in {1..30}; do
        if curl -s http://localhost:3001/api/jobs >/dev/null 2>&1; then
            backend_ready=true
            break
        fi
        sleep 1
    done
    
    # Wait for frontend
    local frontend_ready=false
    for i in {1..30}; do
        if curl -s http://localhost:5173 >/dev/null 2>&1; then
            frontend_ready=true
            break
        fi
        sleep 1
    done
    
    if [ "$backend_ready" = true ] && [ "$frontend_ready" = true ]; then
        echo "🎉 All servers are ready!"
        echo ""
        echo "📱 Frontend: http://localhost:5173"
        echo "🔧 Backend API: http://localhost:3001"
        echo ""
        echo "Press Ctrl+C to stop all servers"
    else
        echo "⚠️  Some servers may not be fully ready"
    fi
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "✅ Backend server stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "✅ Frontend server stopped"
    fi
    echo "👋 Goodbye!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check Node.js version
echo "🔍 Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

# Check and clean ports
echo "🧹 Checking and cleaning ports..."
kill_port 3001  # Backend port
kill_port 5173  # Frontend port
kill_port 5174  # Alternative frontend port

echo ""
echo "📦 Installing dependencies..."

# Start servers
start_backend
start_frontend

echo ""
wait_for_servers

# Keep the script running
echo ""
echo "🔄 Servers are running. Press Ctrl+C to stop."
while true; do
    sleep 1
done 