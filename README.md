# PharmaLens - AI-Powered Medication Plan Scanner

PharmaLens ist eine Progressive Web App (PWA) zur Digitalisierung deutscher Bundesmedikationspläne mittels KI-gestützter OCR und QR-Code-Generierung im BMP30-Format.

## Features

- 📸 Kamera-basierte Erfassung von Medikationsplänen
- 🤖 KI-gestützte OCR mit Ollama (Qwen2.5VL Modell)
- 📄 Dokumentenerkennung und Perspektivkorrektur mit OpenCV.js
- 🔲 QR-Code-Generierung für Medikationsdaten
- 🔒 Vollständige Offline-Funktionalität (keine externen CDN-Abhängigkeiten)
- 🏥 Docker-basiertes Deployment für Krankenhäuser

## Systemanforderungen

- **Docker & Docker Compose**
- **WSL2** (Windows) mit mindestens 48GB RAM-Zuweisung
- **64GB RAM** empfohlen für optimale Performance
- **12+ CPU-Kerne** für parallele Verarbeitung

## Installation

### 1. Repository klonen
```bash
git clone https://github.com/Peuqui/PharmaLens.git
cd PharmaLens
```

### 2. Ollama-Modell herunterladen (WICHTIG!)
Das AI-Modell (6GB) muss separat geladen werden:
```bash
# Container starten und Modell automatisch herunterladen
docker-compose up -d ollama

# Warten bis das Modell geladen ist (kann 5-10 Minuten dauern)
docker logs -f pharmalens_ollama
```

### 3. Alle Services starten
```bash
docker-compose up -d
```

### 4. Zugriff
- Frontend: http://localhost
- Backend API: http://localhost:3000
- Ollama API: http://localhost:11434

## WSL2 Konfiguration (Windows)

Für stabile AI-Performance muss WSL2 ausreichend Speicher zugewiesen bekommen:

1. Erstelle/bearbeite `C:\Users\[username]\.wslconfig`:
```ini
[wsl2]
memory=48GB
processors=12
swap=32GB
```

2. WSL2 neu starten:
```powershell
wsl --shutdown
```

## Entwicklung

### Frontend (Vue.js)
```bash
npm install
npm run dev
```

### Backend (Node.js)
```bash
cd backend
npm install
npm start
```

## Architektur

- **Frontend**: Vue 3 + Vite PWA
- **Backend**: Node.js Express API
- **AI-Service**: Ollama mit Qwen2.5VL (7B Parameter)
- **Deployment**: Docker Compose

## Lizenz

Proprietär - Nur für autorisierte Nutzung in medizinischen Einrichtungen.
