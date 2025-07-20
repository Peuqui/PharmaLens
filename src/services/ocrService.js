// OCR Service mit lokalen Tesseract.js Dateien
class OCRService {
  constructor() {
    this.worker = null
    this.isInitialized = false
    this.Tesseract = null
  }

  async loadTesseract() {
    if (this.Tesseract) return this.Tesseract
    
    // Lade Tesseract.js als Script
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = '/tesseract.min.js'
      script.onload = () => {
        if (window.Tesseract) {
          this.Tesseract = window.Tesseract
          resolve(window.Tesseract)
        } else {
          reject(new Error('Tesseract not found after loading script'))
        }
      }
      script.onerror = (err) => reject(new Error('Failed to load Tesseract.js: ' + err.message))
      document.head.appendChild(script)
    })
  }

  async initialize() {
    if (this.isInitialized) return

    try {
      console.log('Initializing OCR Service...')
      
      // Lade Tesseract
      const Tesseract = await this.loadTesseract()
      console.log('Tesseract loaded successfully')
      
      // Create worker using local files (no CDN dependencies for hospital data privacy)
      console.log('Creating Tesseract worker...')
      this.worker = await Tesseract.createWorker('deu', 1, {
        workerPath: '/tesseract-worker-v5.min.js',
        corePath: '/tesseract-core-v5.wasm.js',
        langPath: '/tessdata',
        logger: (m) => {
          if (m.status) {
            console.log(`Tesseract: ${m.status}${m.progress ? ` (${Math.round(m.progress * 100)}%)` : ''}`)
          }
        }
      })
      
      // Set OCR parameters optimized for German medication plans
      await this.worker.setParameters({
        tessedit_pageseg_mode: '6', // Uniform block of text (better for medication tables)
        preserve_interword_spaces: '1', // Preserve spaces between words
        tessjs_create_pdf: '0', // Don't create PDF (faster)
        
        // Character whitelist for medication plans
        // Include: letters (German umlauts), numbers, punctuation, medication units
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜabcdefghijklmnopqrstuvwxyzäöüß0123456789.,;:-–—()[]/ °%×',
        
        // Improve recognition of medication-specific patterns
        language_model_penalty_non_freq_dict_word: '0.1', // Be more lenient with medical terms
        language_model_penalty_non_dict_word: '0.15',
        
        // Optimize for structured text
        textord_heavy_nr: '1', // Assume more text lines
        textord_force_make_prop_words: '0', // Don't force proportional words
        
        // Better number recognition (for dosages)
        classify_bln_numeric_mode: '1'
      })
      
      this.isInitialized = true
      console.log('OCR Service initialized successfully')
    } catch (error) {
      console.error('OCR initialization error:', error)
      this.isInitialized = false
      throw new Error(`OCR-Initialisierung fehlgeschlagen: ${error.message}`)
    }
  }

  async recognizeText(imageBlob) {
    try {
      console.log('Starting OCR recognition...')
      
      // Ensure worker is initialized
      if (!this.isInitialized || !this.worker) {
        console.log('Worker not initialized, initializing now...')
        await this.initialize()
      }
      
      // Use the worker to recognize text
      const result = await this.worker.recognize(imageBlob)
      
      console.log('OCR completed. Text length:', result.data.text.length)
      console.log('OCR confidence:', result.data.confidence)
      
      return {
        text: result.data.text,
        confidence: result.data.confidence,
        lines: result.data.lines ? result.data.lines.map(line => ({
          text: line.text,
          confidence: line.confidence,
          bbox: line.bbox
        })) : []
      }
    } catch (error) {
      console.error('OCR recognition error:', error)
      throw new Error(`Texterkennung fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`)
    }
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
      this.isInitialized = false
    }
  }

  // Parse medication information from OCR text (optimized for German medication plans)
  parseMedication(ocrText) {
    const medications = []
    const lines = ocrText.split('\n').filter(line => line.trim())

    // Enhanced patterns for German medication plans
    const patterns = {
      // Medication with strength (e.g., "Metformin 500 mg", "ASS 100")
      medication: /^(.+?)\s+(\d+(?:[,\.]\d+)?)\s*(mg|ml|g|μg|IE|I\.E\.|Stk|Tbl|Kps|Trpf|Hub|Beutel)/i,
      
      // Dosage patterns (morning-noon-evening-night)
      dosageScheme: /(\d+(?:[,\.]\d+)?)\s*[-–]\s*(\d+(?:[,\.]\d+)?)\s*[-–]\s*(\d+(?:[,\.]\d+)?)\s*(?:[-–]\s*(\d+(?:[,\.]\d+)?))?/,
      
      // Alternative dosage patterns
      dailyDosage: /(\d+(?:[,\.]\d+)?)\s*[xX×]\s*(?:tägl(?:ich)?|tgl\.?)/i,
      weeklyDosage: /(\d+(?:[,\.]\d+)?)\s*[xX×]\s*(?:wöchentl(?:ich)?|wöch\.?|pro\s*Woche)/i,
      
      // Time specifications
      timeSpec: /(?:morgens?|früh|mittags?|abends?|nachts?|zur\s*Nacht|z\.N\.|vorm\.|nachm\.)/i,
      
      // Form specifications
      form: /(?:Tablette|Tbl\.|Kapsel|Kps\.|Tropfen|Trpf\.|Injektion|Inj\.|Salbe|Creme|Gel|Spray|Pulver|Granulat)/i
    }

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Try to match medication pattern
      const medMatch = line.match(patterns.medication)
      if (medMatch) {
        const medication = {
          name: medMatch[1].trim(),
          strength: medMatch[2].replace(',', '.'), // Normalize decimal separator
          unit: medMatch[3],
          dosage: '',
          instructions: '',
          form: '',
          fullLine: line
        }

        // Look for dosage in the same line or next line
        let dosageText = line
        if (i + 1 < lines.length) {
          dosageText += ' ' + lines[i + 1]
        }

        // Check for dosage scheme (1-0-1-0 format)
        const schemeMatch = dosageText.match(patterns.dosageScheme)
        if (schemeMatch) {
          medication.dosage = schemeMatch[0]
          medication.dosageDetails = {
            morning: parseFloat(schemeMatch[1].replace(',', '.')),
            noon: parseFloat(schemeMatch[2].replace(',', '.')),
            evening: parseFloat(schemeMatch[3].replace(',', '.')),
            night: schemeMatch[4] ? parseFloat(schemeMatch[4].replace(',', '.')) : 0
          }
        }
        
        // Check for daily/weekly dosage
        const dailyMatch = dosageText.match(patterns.dailyDosage)
        if (dailyMatch && !medication.dosage) {
          medication.dosage = dailyMatch[0]
        }
        
        const weeklyMatch = dosageText.match(patterns.weeklyDosage)
        if (weeklyMatch && !medication.dosage) {
          medication.dosage = weeklyMatch[0]
        }

        // Extract form if present
        const formMatch = line.match(patterns.form)
        if (formMatch) {
          medication.form = formMatch[0]
        }

        // Extract time specifications
        const timeMatch = dosageText.match(patterns.timeSpec)
        if (timeMatch) {
          medication.instructions = timeMatch[0]
        }

        medications.push(medication)
      }
    }

    return medications
  }

  // Extract patient information
  parsePatientInfo(ocrText) {
    const info = {
      name: '',
      birthDate: '',
      address: ''
    }

    // Common patterns
    const patterns = {
      name: /(?:Name|Patient):\s*(.+)/i,
      birth: /(?:Geb\.|Geboren|Geburtsdatum):\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i,
      address: /(?:Adresse|Anschrift):\s*(.+)/i
    }

    const nameMatch = ocrText.match(patterns.name)
    if (nameMatch) info.name = nameMatch[1].trim()

    const birthMatch = ocrText.match(patterns.birth)
    if (birthMatch) info.birthDate = birthMatch[1].trim()

    const addressMatch = ocrText.match(patterns.address)
    if (addressMatch) info.address = addressMatch[1].trim()

    return info
  }
}

export default new OCRService()