#!/bin/bash

echo "Waiting for Ollama to be ready..."
until curl -s http://localhost:11434/api/tags > /dev/null; do
    echo "Ollama not ready yet, retrying in 5 seconds..."
    sleep 5
done

echo "Ollama is ready. Pulling required models..."

# Pull Qwen 2.5 Vision model (7B, CPU optimized)
echo "Pulling Qwen 2.5 Vision 7B model..."
ollama pull qwen2.5-vision:7b

# Pull fallback model LLaVA 1.6
echo "Pulling LLaVA 1.6 as fallback model..."
ollama pull llava:7b

echo "Model pulling complete. Available models:"
curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4

echo "Ollama setup complete!"