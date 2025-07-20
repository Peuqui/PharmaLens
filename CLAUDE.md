# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PharmaLens** (formerly Drug2QR) is a Vue.js Progressive Web App (PWA) that digitizes German Federal Medication Plans (Bundesmedikationsplan) using AI-powered OCR and generates QR codes in BMP30 format. The application is designed for hospital deployment with a focus on data privacy and accuracy.

**Key Features**:
- AI-powered OCR using Ollama with vision models (replacing slow Tesseract.js)
- Document detection and perspective correction with OpenCV.js
- QR code generation for medication data
- Complete offline capability (no external CDN dependencies)
- Docker-based deployment for hospitals

## Development Commands

- **Install dependencies**: `npm install`
- **Run development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`

## Architecture

### Vue.js Application
- Built with Vue 3 and Vite
- Progressive Web App with service worker
- Components for camera scanning, medication plans, QR code display
- OCR functionality using Tesseract.js

### Key Components

1. **CameraScanner.vue**: Captures medication plans via camera
2. **MedicationPlan.vue**: Displays and edits medication data
3. **QRCodeDisplay.vue**: Generates and displays QR codes
4. **bmp30Generator.js**: Handles BMP30 format encoding

### BMP30 Format

The QR code uses the German BMP30 standard with:
- Header: `mp` (medication plan identifier)
- Version: `v030`
- Field separator: `$` 
- Value separator: `,`
- Patient fields: Name, birth date, gender, address
- Medication fields: PZN, name, active ingredient, form, strength, dosing, indication

## WSL2 Network Configuration

### IMPORTANT: WSL2 Mirrored Mode Issue

If you cannot access the development server from mobile devices despite having port forwarding configured:

1. **Check if WSL2 is using mirrored mode**:
   - Look for `/mnt/c/Users/[username]/.wslconfig`
   - If it contains `networkingMode=mirrored`, WSL2 shares the same IP as Windows
   - This causes port forwarding to fail (circular routing)

2. **Solution**:
   - Comment out or remove `networkingMode=mirrored` in `.wslconfig`
   - Run `wsl --shutdown` in PowerShell as Administrator
   - Restart WSL - it will get its own IP (usually 172.x.x.x)
   - Re-run port forwarding setup

3. **Port Management**:
   - Use `wsl-port-manager.bat` (run as Administrator)
   - Option 6 (Quick Fix) sets up both port forwarding and firewall rules
   - Option M (MOBILZUGRIFF) is specifically for mobile access
   - Ports configured: 80, 443, 3000, 5173-5179, 8080-8089

### HTTPS for Camera Access

Mobile browsers require HTTPS for camera access:

1. **Development**: 
   - Vite can use self-signed certificates (`https: true` in vite.config.js)
   - Alternative: Use tunneling services (ngrok, localtunnel)

2. **Production**: 
   - Use proper SSL certificates (Let's Encrypt)
   - Deploy behind HTTPS-enabled web server

## Current Status (20.07.2025)

### What Works:
- ✅ HTTP access from localhost (http://localhost:5173)
- ✅ HTTP access from mobile devices (http://192.168.0.1:5173)
- ✅ Port forwarding configured correctly
- ✅ Firewall rules set up
- ✅ WSL2 networking fixed (removed mirrored mode)

### Recent Changes:
- ✅ Localized all external dependencies (no CDN usage)
- ✅ Fixed Tesseract.js compatibility issues
- ✅ Added magnifier for precise corner adjustment
- ✅ Implemented QR code detection and masking
- ❌ Tesseract.js too slow (2+ minutes, 13-15% confidence)
- 🔄 Switching to AI-based OCR with Ollama

### OCR Evolution:
1. **Tesseract.js** - Initial implementation, too slow and inaccurate
2. **SimplifiedOcrService** - Pattern-based fallback (limited functionality)
3. **Ollama with Vision Models** - Next implementation (Docker-based)

## Implementation Plan for AI-Based OCR

### 1. Docker Architecture
```yaml
# docker-compose.yml structure
services:
  frontend:    # Nginx + Vue.js PWA
  backend:     # Node.js API Server  
  ai-service:  # Ollama with Qwen 2.5 VL
```

### 2. Ollama Integration
- **Primary Model**: Qwen 2.5 VL (7B, CPU-optimized)
- **Fallback Model**: LLaVA 1.6
- **Prompt Engineering**: Specialized for German medication plans
- **Output**: Structured JSON matching BMP 2.7 XML schema

### 3. API Endpoints
- `POST /api/ocr/process` - Image → Structured medication data
- `POST /api/medication/parse` - Generate BMP 2.7 XML
- `GET /api/health` - System status and model readiness
- WebSocket for real-time progress updates

### 4. Progressive Enhancement
- Users can correct OCR results during processing
- Support for handwritten additions to printed plans
- Batch processing for multiple pages

### 5. Deployment Strategy
- Docker images optimized for CPU (no GPU required)
- Kubernetes manifests for hospital infrastructure
- Resource requirements: 8GB RAM, 4 CPU cores recommended

### Camera Access Solutions:
1. **Option 1: ADB Reverse (BESTE LÖSUNG)**
   - USB-Debugging aktivieren
   - `adb reverse tcp:5173 tcp:5173`
   - Auf Handy: http://localhost:5173 (localhost = Secure Context!)
   
2. **Option 2**: Cloudflare Tunnel (ohne Account)
   - `npm install -g cloudflared`
   - `cloudflared tunnel --url http://localhost:5173`
   
3. **Option 3**: Chrome Desktop Flag
   - chrome://flags/#unsafely-treat-insecure-origin-as-secure
   - http://192.168.0.1:5173 eintragen
   - Nur auf Desktop, nicht Android!

4. **Option 4**: Deploy to real server with Let's Encrypt
5. **Option 5**: Investigate PWA offline capabilities

### Next Development Steps:
1. **Create Docker setup** with Ollama and API server
2. **Implement REST API** for frontend-AI communication  
3. **Update Vue components** to use new AI backend
4. **Remove obsolete files** (test HTMLs, Tesseract workarounds)
5. **Create GitHub repository** as "PharmaLens"

### Files to Clean Up:
- `/public/test-*.html` - Tesseract debugging files
- Old OCR service implementations (keep as reference)
- Temporary workaround files

### Files Created:
- `/certs/` - Contains SSL certificates (ca.crt, cert.crt, etc.)
- `/public/certs/ca.crt` - CA certificate for download
- `/public/install-cert.html` - Instructions for certificate installation
- `wsl-port-manager.bat` - Enhanced with Option M for mobile access

## Important Notes

- All UI text is in German - maintain German language
- Camera access requires HTTPS (except localhost)
- PWA features require HTTPS in production
- QR code generation uses external API (`https://api.qrserver.com/v1/`)
- Print layout optimized for A4 paper
- **Current server runs on HTTP** - switch to HTTPS needed for camera
- **Project renamed** from Drug2QR to PharmaLens (20.07.2025)