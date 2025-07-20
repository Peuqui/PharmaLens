// Multi-OCR Pipeline Service
// Kombiniert mehrere OCR-Engines für höhere Genauigkeit

import { ref } from 'vue'
import ocrService from './ocrService' // Tesseract.js

class MultiOcrService {
  constructor() {
    this.engines = new Map()
    this.isInitialized = ref(false)
    this.initProgress = ref(0)
    
    // Register available engines
    this.registerEngine('tesseract', {
      name: 'Tesseract.js',
      weight: 1.0,
      initialize: () => ocrService.initialize(),
      recognize: (blob) => ocrService.recognizeText(blob)
    })
  }

  // Register an OCR engine
  registerEngine(id, engine) {
    this.engines.set(id, {
      ...engine,
      id,
      isReady: ref(false),
      lastResult: null
    })
  }

  // Initialize all engines
  async initialize() {
    if (this.isInitialized.value) return
    
    const engineCount = this.engines.size
    let initialized = 0
    
    // Initialisiere alle Engines parallel
    const initPromises = []
    
    for (const [id, engine] of this.engines) {
      const promise = engine.initialize()
        .then(() => {
          console.log(`${engine.name} initialized successfully`)
          engine.isReady.value = true
          initialized++
          this.initProgress.value = (initialized / engineCount) * 100
        })
        .catch(error => {
          console.error(`Failed to initialize ${engine.name}:`, error)
        })
      
      initPromises.push(promise)
    }
    
    // Warte maximal 10 Sekunden auf alle Engines
    await Promise.race([
      Promise.allSettled(initPromises),
      new Promise(resolve => setTimeout(resolve, 10000))
    ])
    
    this.isInitialized.value = initialized > 0
    return this.isInitialized.value
  }

  // Run OCR with all available engines
  async recognizeText(imageBlob, options = {}) {
    const results = []
    const timeout = options.timeout || 120000 // 120 seconds for slow Tesseract.js
    
    // Run all engines in parallel
    const promises = []
    
    for (const [id, engine] of this.engines) {
      if (!engine.isReady.value) continue
      
      const enginePromise = this.runEngineWithTimeout(
        engine,
        imageBlob,
        timeout
      ).then(result => {
        results.push({
          engineId: id,
          engineName: engine.name,
          weight: engine.weight,
          ...result
        })
      }).catch(error => {
        console.error(`${engine.name} failed:`, error)
        // Continue with other engines
      })
      
      promises.push(enginePromise)
    }
    
    // Wait for all engines to complete
    await Promise.allSettled(promises)
    
    // If no results, throw error
    if (results.length === 0) {
      throw new Error('All OCR engines failed')
    }
    
    // Combine results
    return this.combineResults(results, options)
  }

  // Run engine with timeout
  async runEngineWithTimeout(engine, imageBlob, timeout) {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
    
    const startTime = Date.now()
    const result = await Promise.race([
      engine.recognize(imageBlob),
      timeoutPromise
    ])
    const endTime = Date.now()
    
    return {
      ...result,
      processingTime: endTime - startTime
    }
  }

  // Combine results from multiple engines
  combineResults(results, options = {}) {
    // Simple implementation for now - use highest confidence
    // TODO: Implement more sophisticated voting/consensus
    
    let bestResult = null
    let highestScore = 0
    
    // Calculate weighted scores
    for (const result of results) {
      const score = (result.confidence || 0) * result.weight
      if (score > highestScore) {
        highestScore = score
        bestResult = result
      }
    }
    
    // Prepare combined result
    const combined = {
      text: bestResult.text || '',
      confidence: bestResult.confidence || 0,
      engineUsed: bestResult.engineName,
      processingTime: bestResult.processingTime,
      allResults: results
    }
    
    // Apply medication-specific post-processing
    if (options.medicationMode) {
      combined.text = this.postProcessMedication(combined.text)
      combined.medications = this.extractMedications(combined.text)
    }
    
    return combined
  }

  // Post-process for medication plans
  postProcessMedication(text) {
    // Common OCR mistakes in medication plans
    const corrections = [
      // Dosage patterns
      { pattern: /(\d+)\s*x\s*(\d+)/g, replacement: '$1×$2' },
      { pattern: /(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/g, replacement: '$1-$2-$3' },
      
      // Common medication terms
      { pattern: /\btbl\b/gi, replacement: 'Tbl.' },
      { pattern: /\bkps\b/gi, replacement: 'Kps.' },
      { pattern: /\btrpf\b/gi, replacement: 'Trpf.' },
      { pattern: /\bstk\b/gi, replacement: 'Stk.' },
      
      // Fix common OCR errors
      { pattern: /\brng\b/gi, replacement: 'mg' },
      { pattern: /\brn[lg]\b/gi, replacement: 'ml' },
      { pattern: /\b[il]E\b/g, replacement: 'IE' }, // International Units
    ]
    
    let processed = text
    for (const correction of corrections) {
      processed = processed.replace(correction.pattern, correction.replacement)
    }
    
    return processed
  }

  // Extract structured medication data
  extractMedications(text) {
    const medications = []
    const lines = text.split('\n').filter(line => line.trim())
    
    // Simple pattern matching for medication lines
    const medicationPattern = /^(.+?)\s+(\d+(?:[,\.]\d+)?)\s*(mg|ml|IE|Stk\.?|Tbl\.?|Kps\.?)/i
    const dosagePattern = /(\d+(?:[,\.]\d+)?)\s*[-x×]\s*(\d+(?:[,\.]\d+)?)\s*[-x×]\s*(\d+(?:[,\.]\d+)?)/
    
    for (const line of lines) {
      const medMatch = line.match(medicationPattern)
      if (medMatch) {
        const medication = {
          name: medMatch[1].trim(),
          strength: medMatch[2],
          unit: medMatch[3],
          fullLine: line
        }
        
        // Try to find dosage
        const dosageMatch = line.match(dosagePattern)
        if (dosageMatch) {
          medication.dosage = {
            morning: dosageMatch[1],
            noon: dosageMatch[2],
            evening: dosageMatch[3]
          }
        }
        
        medications.push(medication)
      }
    }
    
    return medications
  }

  // Get engine status
  getEngineStatus() {
    const status = []
    for (const [id, engine] of this.engines) {
      status.push({
        id,
        name: engine.name,
        ready: engine.isReady.value,
        weight: engine.weight
      })
    }
    return status
  }
}

// Create and export singleton instance
const multiOcrService = new MultiOcrService()

// Future: Add more engines when available
// multiOcrService.registerEngine('paddleocr', {...})
// multiOcrService.registerEngine('trocr', {...})
// multiOcrService.registerEngine('easyocr', {...})

export default multiOcrService