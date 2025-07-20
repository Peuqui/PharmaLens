import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Ollama configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5vl:7b';

// German medication plan prompt
const MEDICATION_PLAN_PROMPT = `Du bist ein Experte für deutsche Bundesmedikationspläne. Analysiere das Bild eines Medikationsplans und extrahiere alle Informationen.

WICHTIG: Antworte NUR mit einem validen JSON-Objekt, keine zusätzlichen Erklärungen!

Das JSON muss folgende Struktur haben:
{
  "patient": {
    "name": "Nachname, Vorname",
    "birthDate": "TT.MM.JJJJ",
    "gender": "m/w/d",
    "address": "Straße, PLZ Ort"
  },
  "medications": [
    {
      "pzn": "8-stellige Nummer oder null",
      "name": "Medikamentenname",
      "activeIngredient": "Wirkstoff",
      "form": "Darreichungsform (z.B. Tabletten, Tropfen)",
      "strength": "Stärke mit Einheit (z.B. 100mg, 50ml)",
      "dosing": {
        "morning": "Anzahl oder 0",
        "noon": "Anzahl oder 0",
        "evening": "Anzahl oder 0",
        "night": "Anzahl oder 0"
      },
      "unit": "Einheit (z.B. Stück, ml)",
      "indication": "Anwendungsgrund",
      "notes": "Zusätzliche Hinweise"
    }
  ],
  "issueDate": "TT.MM.JJJJ",
  "doctor": {
    "name": "Name des Arztes",
    "phone": "Telefonnummer"
  }
}

Wenn ein Feld nicht lesbar oder nicht vorhanden ist, verwende null.
Bei der Dosierung: Verwende 0 für nicht einzunehmende Zeiten.`;

// Process OCR request
router.post('/process', async (req, res) => {
  const logger = req.app.locals.logger;
  const upload = req.app.locals.upload;
  const wss = req.app.locals.wss;

  // Handle file upload
  upload.single('image')(req, res, async (err) => {
    if (err) {
      logger.error('Upload error:', err);
      return res.status(400).json({
        error: {
          message: 'Fehler beim Datei-Upload',
          details: err.message
        }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: {
          message: 'Keine Bilddatei erhalten'
        }
      });
    }

    const sessionId = req.body.sessionId || Date.now().toString();
    
    try {
      // Notify WebSocket clients about processing start
      broadcastToSession(wss, sessionId, {
        type: 'ocr_start',
        message: 'OCR-Verarbeitung gestartet...'
      });

      // Convert image to base64
      const base64Image = req.file.buffer.toString('base64');

      logger.info(`Starting OCR processing for session ${sessionId}`);
      
      // Send to Ollama
      const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: OLLAMA_MODEL,
        prompt: MEDICATION_PLAN_PROMPT,
        images: [base64Image],
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          num_predict: 2048
        }
      }, {
        timeout: 300000 // 5 minutes timeout
      });

      broadcastToSession(wss, sessionId, {
        type: 'ocr_processing',
        message: 'Analysiere Medikationsplan...'
      });

      // Parse Ollama response
      let medicationData;
      try {
        const responseText = response.data.response;
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          medicationData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Kein JSON in der Antwort gefunden');
        }
      } catch (parseError) {
        logger.error('JSON parse error:', parseError);
        throw new Error('Fehler beim Parsen der OCR-Ergebnisse');
      }

      // Validate and clean data
      medicationData = validateMedicationData(medicationData);

      broadcastToSession(wss, sessionId, {
        type: 'ocr_complete',
        message: 'OCR abgeschlossen',
        data: medicationData
      });

      res.json({
        success: true,
        data: medicationData,
        sessionId
      });

    } catch (error) {
      logger.error('OCR processing error:', error);
      
      broadcastToSession(wss, sessionId, {
        type: 'ocr_error',
        message: 'Fehler bei der OCR-Verarbeitung',
        error: error.message
      });

      res.status(500).json({
        error: {
          message: 'Fehler bei der OCR-Verarbeitung',
          details: error.message
        }
      });
    }
  });
});

// Validate and clean medication data
function validateMedicationData(data) {
  const cleaned = {
    patient: {
      name: data.patient?.name || null,
      birthDate: data.patient?.birthDate || null,
      gender: data.patient?.gender || null,
      address: data.patient?.address || null
    },
    medications: [],
    issueDate: data.issueDate || null,
    doctor: {
      name: data.doctor?.name || null,
      phone: data.doctor?.phone || null
    }
  };

  if (Array.isArray(data.medications)) {
    cleaned.medications = data.medications.map(med => ({
      pzn: med.pzn || null,
      name: med.name || 'Unbekanntes Medikament',
      activeIngredient: med.activeIngredient || null,
      form: med.form || null,
      strength: med.strength || null,
      dosing: {
        morning: parseFloat(med.dosing?.morning) || 0,
        noon: parseFloat(med.dosing?.noon) || 0,
        evening: parseFloat(med.dosing?.evening) || 0,
        night: parseFloat(med.dosing?.night) || 0
      },
      unit: med.unit || 'Stück',
      indication: med.indication || null,
      notes: med.notes || null
    }));
  }

  return cleaned;
}

// Broadcast message to specific session
function broadcastToSession(wss, sessionId, message) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify({
        sessionId,
        ...message
      }));
    }
  });
}

export default router;