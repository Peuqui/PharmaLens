#!/bin/bash

# Start Ollama server in the background
ollama serve &

# Wait for Ollama to be ready
echo "Waiting for Ollama to start..."
sleep 10

# Pull models
/pull-models.sh

# Keep container running
tail -f /dev/null