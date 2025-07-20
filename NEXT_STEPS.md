# PharmaLens - Nächste Schritte für Docker/Ollama Implementation

## Aktueller Status (20.07.2025, 22:35)
- ✅ Repository umbenannt von Drug2QR zu PharmaLens
- ✅ Git Repository initialisiert und zu GitHub gepusht
- ✅ URL: https://github.com/Peuqui/PharmaLens
- ✅ Alte Test-Dateien aufgeräumt
- ✅ CLAUDE.md mit Implementierungsplan aktualisiert

## Nächster Schritt: Docker-Setup mit Ollama

### 1. Docker-Struktur erstellen
```
PharmaLens/
├── docker/
│   ├── frontend/
│   │   └── Dockerfile
│   ├── backend/
│   │   └── Dockerfile
│   └── ollama/
│       └── Dockerfile
├── docker-compose.yml
└── backend/
    ├── package.json
    ├── server.js
    └── api/
        └── ocr.js
```

### 2. Docker Compose Konfiguration
Die docker-compose.yml sollte 3 Services definieren:
- **frontend**: Nginx mit der Vue.js PWA
- **backend**: Node.js API Server für Kommunikation mit Ollama
- **ollama**: Ollama Service mit Qwen 2.5 VL Modell

### 3. Backend API implementieren
Endpoints:
- POST `/api/ocr/process` - Bild an Ollama senden
- POST `/api/medication/parse` - BMP 2.7 XML generieren
- GET `/api/health` - Systemstatus

### 4. Ollama Prompt für Medikationspläne
```
Analysiere diesen deutschen Medikationsplan und extrahiere:
1. Patientendaten (Name, Geburtsdatum, Adresse)
2. Medikamente mit:
   - Name
   - Stärke und Einheit (mg, ml, etc.)
   - Darreichungsform
   - Dosierung (morgens-mittags-abends-nachts)
   - Hinweise
Ausgabe als JSON gemäß BMP 2.7 Schema.
```

### 5. Frontend anpassen
- DocumentScanner.vue: API-Calls statt Tesseract
- Neuer Service: `ollamaOcrService.js`
- WebSocket für Fortschrittsanzeige

## Wichtige Dateien im Projekt
- `/src/services/ocrService.js` - Alte Tesseract Implementation (Referenz)
- `/src/services/imageProcessingService.js` - Bildvorverarbeitung (behalten!)
- `/src/components/DocumentScanner.vue` - Muss API nutzen
- `CLAUDE.md` - Enthält vollständigen Implementierungsplan

## Befehle für die neue Session
```bash
cd /home/mp/medizin/PharmaLens
npm run dev  # Frontend läuft noch
```

## TODOs
1. Docker und Docker Compose prüfen: `docker --version && docker-compose --version`
2. Backend-Struktur erstellen
3. docker-compose.yml schreiben
4. Ollama Dockerfile mit Qwen 2.5 VL
5. Backend API implementieren
6. Frontend auf API umstellen

## Hinweise
- Tesseract.js war zu langsam (2+ Minuten, 13-15% Confidence)
- Qwen 2.5 VL ist CPU-optimiert und sollte deutlich besser performen
- Komplett offline (keine CDN-Abhängigkeiten für Krankenhausdaten)