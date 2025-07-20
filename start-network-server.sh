#!/bin/bash
# Start Vite server accessible from network

echo "Stopping any existing Vite servers..."
pkill -f "vite" 2>/dev/null

echo "Starting Vite server with network access..."
echo "Server will be available at:"
echo "- http://localhost:5173 (local)"
echo "- http://192.168.0.1:5173 (network)"
echo ""

# Start Vite with host binding
npm run dev -- --host 0.0.0.0 --port 5173