# Drug2QR Projektarchitektur & Zukunftsvision

## 🏗️ Architektur-Evolution

### Phase 1: Lokale PWA (Aktuell)
```
┌─────────────────┐
│   PWA (Handy)   │
│  - Foto machen  │
│  - OpenCV.js    │
│  - Multi-OCR    │
│  - QR-Code      │
└─────────────────┘
```

### Phase 2: Hybrid mit Ollama (Geplant)
```
┌─────────────────┐     ┌────────────────────┐
│   PWA (Handy)   │────▶│  Privater Server   │
│  - Foto machen  │     │  - WireGuard VPN   │
│  - Vorschau     │     │  - Ollama/LLM      │
│  - Upload       │     │  - Bildverarbeitung│
└─────────────────┘     │  - HL7 Generator   │
                        └────────────────────┘
```

### Phase 3: Krankenhaus-Integration
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Stations-  │────▶│  Drug2QR     │────▶│    KIS      │
│   Tablets   │     │   Server     │     │ (HL7/FHIR) │
└─────────────┘     └──────────────┘     └─────────────┘
```

## 🎯 Anwendungsfälle

### Primär: Krankenhaus
- Digitalisierung papierbasierter Medikamentenpläne
- Integration in Kliniksysteme
- Reduzierung von Medikationsfehlern
- Zeitersparnis bei Aufnahme

### Sekundär: Ambulant
- Hausärzte
- Apotheken  
- Pflegeheime
- Privatnutzer

## 🔐 Datenschutz-Konzept

### Stufe 1: 100% Lokal
- Alle Verarbeitung im Browser
- Keine Datenübertragung
- Offline-fähig

### Stufe 2: Privater Server
- WireGuard VPN
- Ende-zu-Ende Verschlüsselung
- Keine Cloud-Dienste
- Selbst-gehostet

### Stufe 3: Krankenhaus
- On-Premise Installation
- AD/LDAP Integration
- Audit-Logging
- Compliance mit Medizinprodukte-Richtlinien

## 🚀 Technologie-Stack

### Frontend (PWA)
- Vue.js 3
- OpenCV.js
- Tesseract.js + Multi-OCR
- ONNX.js für ML-Modelle
- IndexedDB

### Backend (Optional)
- FastAPI (Python)
- Ollama für LLM
- PostgreSQL
- Redis Queue
- Docker

### Integration
- HL7 v2 / FHIR
- DICOM (perspektivisch)
- REST API
- WebSockets