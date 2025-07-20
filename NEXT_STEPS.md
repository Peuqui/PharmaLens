# PharmaLens - Nächste Schritte für Docker/Ollama Implementation

## Aktueller Status (20.07.2025, 23:00)
- ✅ Repository umbenannt von Drug2QR zu PharmaLens
- ✅ Git Repository initialisiert und zu GitHub gepusht
- ✅ URL: https://github.com/Peuqui/PharmaLens
- ✅ Alte Test-Dateien aufgeräumt
- ✅ CLAUDE.md mit Implementierungsplan aktualisiert
- ✅ Docker-Setup implementiert mit Ollama und Backend
- ✅ Ollama läuft mit Qwen2.5VL:7b Modell
- ⚠️ **MEMORY ISSUE**: Modell verbraucht 98% RAM bei Bildanalyse
- ✅ **LÖSUNG**: WSL2 Konfiguration angepasst (48GB RAM, 12 CPUs)

## WSL2 Neustart erforderlich!

**WICHTIG: Bevor du weitermachst:**
1. PowerShell als Administrator öffnen
2. `wsl --shutdown` ausführen
3. WSL2 neu starten (Terminal öffnen)
4. Mit `free -h` prüfen ob 48GB RAM verfügbar sind

## Aktuelle Docker-Struktur (bereits implementiert)
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

## Nach WSL2 Neustart - Nächste Schritte

### 1. Docker Container neu starten
```bash
cd /home/mp/medizin/PharmaLens
docker-compose down
docker-compose up -d
```

### 2. OCR-Funktionalität testen
- Frontend: http://localhost:5173
- Backend Health-Check: http://localhost:3000/api/health
- Test-Bild hochladen und OCR ausführen

### 3. Bei Erfolg: Frontend-Integration vervollständigen
- OllamaOcrProcessor.vue fertigstellen
- Fehlerbehandlung verbessern
- Loading-States optimieren

## Bekannte Probleme & Lösungen

### Memory-Problem
- **Symptom**: Ollama nutzt 98% RAM bei Bildanalyse
- **Ursache**: WSL2 Standard-Allocation zu klein (nur 30GB statt 48GB)
- **Lösung**: `.wslconfig` mit 48GB RAM, 12 CPUs, 32GB Swap

### Performance-Optimierung
- Bildvorverarbeitung beibehalten (imageProcessingService.js)
- Nur relevante Bildausschnitte an Ollama senden
- Caching für wiederholte Anfragen implementieren

## Hinweise
- Tesseract.js war zu langsam (2+ Minuten, 13-15% Confidence)
- Qwen2.5VL:7b benötigt ~6GB Model + 10-12GB für Inference
- Komplett offline (keine CDN-Abhängigkeiten für Krankenhausdaten)
- **WICHTIG**: Erst WSL2 neu starten, dann Docker Container!