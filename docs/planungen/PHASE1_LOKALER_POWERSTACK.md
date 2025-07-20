# Detaillierter Implementierungsplan - Phase 1: Lokaler Power-Stack

## 🎯 Projektvision
Transformation von Drug2QR in eine professionelle Medikamentenplan-Digitalisierungslösung für den Krankenhaus-Einsatz mit maximaler lokaler Verarbeitungspower.

## 📋 Entwicklungs-Roadmap

### **Woche 1-2: Bildverarbeitung & Perspektivkorrektur**

#### 1.1 OpenCV.js Integration
- **Einbindung:** OpenCV.js (8MB) als WebAssembly
- **Features:**
  - Automatische Dokumentenerkennung (Canny Edge Detection)
  - 4-Punkt Perspektivtransformation
  - Adaptive Schwellwertbildung
  - Morphologische Operationen (Rauschunterdrückung)

#### 1.2 Verbesserter Capture-Workflow
```
Foto → Auto-Detect → Manuelle Anpassung → Perspektivkorrektur → 
→ Orientierung prüfen → Fein-Crop → Bildoptimierung
```

#### 1.3 Bildvorverarbeitung
- Histogramm-Ausgleich
- Schärfung (Unsharp Mask)
- Binarisierung mit OTSU-Methode
- Deskewing (Textbegradigung)

### **Woche 3-4: Multi-OCR Power-Stack**

#### 2.1 OCR-Ensemble Architektur
```javascript
// Lokaler OCR Power-Stack
const ocrPipeline = {
  // Stufe 1: Layout-Analyse
  layoutDetection: async (image) => {
    // OpenCV.js: Textregionen identifizieren
    // Tabellen vs. Freitext unterscheiden
  },
  
  // Stufe 2: Parallel-OCR
  multiOCR: async (regions) => {
    return Promise.all([
      tesseractOCR(regions),      // Basis
      paddleOCR(regions),         // Modern (wenn JS-Port verfügbar)
      ocrSpaceLocal(regions)      // Lightweight Alternative
    ])
  },
  
  // Stufe 3: Ergebnis-Fusion
  mergeResults: (results) => {
    // Voting-Algorithmus
    // Konfidenz-gewichtetes Merging
    // Strukturvalidierung
  }
}
```

#### 2.2 ONNX.js für ML-Modelle
- TrOCR-small Model (50MB) konvertiert zu ONNX
- LayoutLM für Strukturerkennung
- Lokale Inferenz im Browser

#### 2.3 Intelligente Nachverarbeitung
- Medikamenten-Datenbank (lokal)
- Regex-Patterns für Dosierungen
- Fuzzy-Matching für Medikamentennamen
- Plausibilitätsprüfung

### **Woche 5-6: Krankenhaus-optimierte UI**

#### 3.1 Batch-Verarbeitung
- Queue-System für mehrere Scans
- Fortschrittsanzeige
- Fehlerbehandlung pro Dokument

#### 3.2 Strukturierte Datenerfassung
```typescript
interface MedicationPlan {
  patient: {
    name: string
    birthDate: string
    patientId?: string
  }
  medications: Array<{
    name: string
    activeIngredient: string
    strength: string
    form: string
    dosage: {
      morning: number
      noon: number
      evening: number
      night: number
    }
    instructions: string
    handwrittenNotes?: string
  }>
  metadata: {
    scanDate: Date
    confidence: number
    ocrMethod: string[]
  }
}
```

#### 3.3 Export-Funktionen
- JSON/CSV Export
- PDF-Generierung
- QR-Code (BMP30)
- Vorbereitung für HL7/FHIR

### **Woche 7-8: Testing & Optimierung**

#### 4.1 Performance-Optimierung
- Web Workers für OCR
- IndexedDB für Caching
- Progressive Enhancement

#### 4.2 Offline-Capabilities
- Service Worker Update
- Lokale Modell-Speicherung
- Sync-Queue für spätere Verarbeitung

## 🔧 Technischer Stack

### Core Libraries
```json
{
  "dependencies": {
    "opencv-js": "^4.8.0",          // Bildverarbeitung
    "tesseract.js": "^5.0.0",       // OCR Basis
    "onnxruntime-web": "^1.16.0",   // ML Inferenz
    "pdfjs": "^3.0.0",              // PDF Handling
    "fuzzyset.js": "^1.0.0",        // Fuzzy Matching
    "dexie": "^3.0.0"               // IndexedDB Wrapper
  }
}
```

### Modell-Integration (wenn verfügbar)
- TrOCR-small-printed (ONNX)
- LayoutLMv3 (ONNX)
- Custom Medikamenten-Modell

## 📊 Erfolgsmetriken

### Phase 1 Ziele
- OCR-Genauigkeit: >85% (von aktuell ~50%)
- Verarbeitungszeit: <10s pro Scan
- Offline-fähig: 100%
- Speicherbedarf: <200MB

### Validierung
- Test-Set: 50 echte Medikamentenpläne
- Verschiedene Qualitäten/Formate
- Handschriftliche Annotationen
- Benchmark gegen kommerzielle Lösungen

## 🚀 Nächste Schritte

1. **Sofort:** OpenCV.js einbinden und Perspektivkorrektur implementieren
2. **Dann:** Multi-Stage Image Processing Pipeline
3. **Parallel:** ONNX.js Setup und Modell-Konvertierung testen
4. **Abschluss:** UI für Krankenhaus-Workflow anpassen

## 🔮 Ausblick Phase 2
- Ollama-Backend als optionales "Pro-Feature"
- HL7 FHIR Integration
- Multi-Mandanten-Fähigkeit
- Audit-Logging