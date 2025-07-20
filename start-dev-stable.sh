#!/bin/bash
# Stabiler Dev-Server Start

echo "Beende alte Prozesse..."
pkill -f "npm|vite" 2>/dev/null

echo "Warte kurz..."
sleep 2

echo "Starte Vite mit optimierten Einstellungen..."
export NODE_OPTIONS="--max-old-space-size=2048"
npm run dev