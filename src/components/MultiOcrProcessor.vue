<template>
  <div class="multi-ocr-processor">
    <div class="processor-container">
      <!-- Processing Status -->
      <div v-if="processing" class="processing-status">
        <div class="spinner-large"></div>
        <h3>Medikationsplan wird analysiert...</h3>
        
        <!-- Engine Status -->
        <div class="engine-status">
          <div v-for="engine in engineStatus" :key="engine.id" class="engine-item">
            <span class="engine-name">{{ engine.name }}</span>
            <span class="engine-state">
              <span v-if="engine.processing" class="processing">⏳ Verarbeitung...</span>
              <span v-else-if="engine.completed" class="completed">✅ {{ engine.confidence }}%</span>
              <span v-else-if="engine.failed" class="failed">❌ Fehler</span>
              <span v-else class="waiting">⏸️ Warten...</span>
            </span>
          </div>
        </div>
        
        <!-- Overall Progress -->
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: overallProgress + '%' }"></div>
        </div>
        <p class="progress-text">{{ progressMessage }}</p>
      </div>
      
      <!-- Results -->
      <div v-if="!processing && result" class="ocr-results">
        <h3>Erkannter Text</h3>
        
        <!-- Confidence Score -->
        <div class="confidence-indicator">
          <span class="label">Erkennungsgenauigkeit:</span>
          <div class="confidence-bar">
            <div 
              class="confidence-fill" 
              :style="{ 
                width: result.confidence + '%',
                backgroundColor: getConfidenceColor(result.confidence)
              }"
            ></div>
          </div>
          <span class="confidence-value">{{ Math.round(result.confidence) }}%</span>
        </div>
        
        <!-- Engine Used -->
        <div class="engine-info">
          <span>Beste Erkennung: <strong>{{ result.engineUsed }}</strong></span>
          <span class="processing-time">{{ result.processingTime }}ms</span>
        </div>
        
        <!-- Recognized Text -->
        <div class="text-preview">
          <pre>{{ result.text }}</pre>
        </div>
        
        <!-- Extracted Medications -->
        <div v-if="result.medications && result.medications.length > 0" class="medications-list">
          <h4>Erkannte Medikamente ({{ result.medications.length }})</h4>
          <div v-for="(med, index) in result.medications" :key="index" class="medication-item">
            <div class="med-name">{{ med.name }}</div>
            <div class="med-details">
              <span class="med-strength">{{ med.strength }} {{ med.unit }}</span>
              <span v-if="med.dosage" class="med-dosage">
                {{ med.dosage.morning }}-{{ med.dosage.noon }}-{{ med.dosage.evening }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="action-buttons">
          <button @click="retry" class="btn btn-secondary">
            🔄 Erneut verarbeiten
          </button>
          <button @click="editText" class="btn btn-secondary">
            ✏️ Text bearbeiten
          </button>
          <button @click="confirm" class="btn btn-primary" :disabled="result.confidence < 50">
            ✓ Übernehmen
          </button>
        </div>
        
        <!-- Low Confidence Warning -->
        <div v-if="result.confidence < 50" class="warning-message">
          ⚠️ Die Erkennungsgenauigkeit ist niedrig. Bitte überprüfen Sie den Text sorgfältig.
        </div>
      </div>
      
      <!-- Error State -->
      <div v-if="error" class="error-state">
        <h3>❌ Fehler bei der Texterkennung</h3>
        <p>{{ error }}</p>
        <div class="error-actions">
          <button @click="retry" class="btn btn-secondary">
            🔄 Erneut versuchen
          </button>
          <button @click="skipOcr" class="btn btn-warning">
            ⏭️ Ohne OCR fortfahren
          </button>
          <button @click="cancel" class="btn btn-secondary">
            ❌ Abbrechen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import multiOcrService from '../services/multiOcrService'

const props = defineProps({
  imageBlob: Blob
})

const emit = defineEmits(['completed', 'cancel', 'edit'])

// State
const processing = ref(false)
const result = ref(null)
const error = ref('')
const engineStatus = ref([])
const overallProgress = ref(0)
const progressMessage = ref('Initialisierung...')

// Computed
const getConfidenceColor = (confidence) => {
  if (confidence >= 80) return '#4CAF50'
  if (confidence >= 60) return '#FF9800'
  return '#f44336'
}

// Lifecycle
onMounted(() => {
  startOcrProcessing()
})

// Start OCR processing
const startOcrProcessing = async () => {
  processing.value = true
  error.value = ''
  overallProgress.value = 10
  
  try {
    // Initialize multi-OCR service with timeout
    progressMessage.value = 'OCR-Engines werden geladen...'
    
    // Timeout nach 20 Sekunden (für lokale große Dateien)
    const initPromise = multiOcrService.initialize()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OCR-Initialisierung Timeout')), 20000)
    )
    
    try {
      await Promise.race([initPromise, timeoutPromise])
    } catch (initError) {
      console.warn('OCR initialization failed or timed out:', initError)
      progressMessage.value = 'OCR-Initialisierung fehlgeschlagen - verwende Fallback...'
    }
    
    overallProgress.value = 30
    
    // Get engine status
    engineStatus.value = multiOcrService.getEngineStatus().map(engine => ({
      ...engine,
      processing: false,
      completed: false,
      failed: false,
      confidence: 0
    }))
    
    // Start processing
    progressMessage.value = 'Medikationsplan wird analysiert...'
    overallProgress.value = 50
    
    // Mark engines as processing
    engineStatus.value.forEach(engine => {
      if (engine.ready) {
        engine.processing = true
      }
    })
    
    // Run OCR
    const ocrResult = await multiOcrService.recognizeText(props.imageBlob, {
      medicationMode: true,
      timeout: 30000  // 30 Sekunden für OCR-Verarbeitung
    })
    
    // Update engine status based on results
    if (ocrResult.allResults) {
      ocrResult.allResults.forEach(result => {
        const engine = engineStatus.value.find(e => e.id === result.engineId)
        if (engine) {
          engine.processing = false
          engine.completed = true
          engine.confidence = Math.round(result.confidence || 0)
        }
      })
    }
    
    overallProgress.value = 90
    progressMessage.value = 'Ergebnisse werden aufbereitet...'
    
    // Store result
    result.value = ocrResult
    overallProgress.value = 100
    
    setTimeout(() => {
      processing.value = false
    }, 500)
    
  } catch (err) {
    console.error('OCR processing failed:', err)
    error.value = err.message || 'Texterkennung fehlgeschlagen'
    processing.value = false
    
    // Mark all engines as failed
    engineStatus.value.forEach(engine => {
      engine.processing = false
      engine.failed = true
    })
  }
}

// Retry OCR
const retry = () => {
  result.value = null
  error.value = ''
  startOcrProcessing()
}

// Edit recognized text
const editText = () => {
  emit('edit', result.value)
}

// Confirm and proceed
const confirm = () => {
  if (result.value) {
    emit('completed', result.value)
  }
}

// Skip OCR and proceed manually
const skipOcr = () => {
  // Emit empty result to proceed with manual entry
  emit('completed', {
    text: '',
    confidence: 0,
    engineUsed: 'Manual',
    medications: []
  })
}

// Cancel processing
const cancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.multi-ocr-processor {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 1100;
  overflow-y: auto;
}

.processor-container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* Processing Status */
.processing-status {
  text-align: center;
  padding: 2rem;
}

.spinner-large {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(0, 102, 204, 0.2);
  border-top: 4px solid #0066CC;
  border-radius: 50%;
  margin: 0 auto 1.5rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.engine-status {
  margin: 2rem 0;
  text-align: left;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 1rem;
}

.engine-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.engine-item:last-child {
  border-bottom: none;
}

.engine-name {
  font-weight: 500;
}

.engine-state {
  font-size: 0.9rem;
}

.engine-state .processing {
  color: #FF9800;
}

.engine-state .completed {
  color: #4CAF50;
}

.engine-state .failed {
  color: #f44336;
}

.engine-state .waiting {
  color: #666;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin: 1rem 0;
}

.progress-fill {
  height: 100%;
  background: #0066CC;
  transition: width 0.3s ease;
}

.progress-text {
  color: #666;
  font-size: 0.9rem;
}

/* Results */
.ocr-results {
  padding: 1rem 0;
}

.confidence-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 6px;
}

.confidence-bar {
  flex: 1;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.confidence-value {
  font-size: 1.2rem;
  font-weight: bold;
  min-width: 50px;
  text-align: right;
}

.engine-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #e3f2fd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.processing-time {
  color: #666;
}

.text-preview {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  margin: 1rem 0;
  max-height: 300px;
  overflow-y: auto;
}

.text-preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.4;
}

/* Medications List */
.medications-list {
  margin: 1.5rem 0;
  padding: 1rem;
  background: #f0f7ff;
  border-radius: 6px;
  border: 1px solid #bbdefb;
}

.medications-list h4 {
  margin: 0 0 1rem 0;
  color: #0066CC;
}

.medication-item {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.medication-item:last-child {
  margin-bottom: 0;
}

.med-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.med-details {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: #666;
}

.med-strength {
  color: #0066CC;
}

.med-dosage {
  background: #e0e0e0;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
}

/* Actions */
.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
  flex-wrap: wrap;
}

/* Error State */
.error-state {
  text-align: center;
  padding: 2rem;
}

.error-state h3 {
  color: #f44336;
  margin-bottom: 1rem;
}

/* Warning */
.warning-message {
  margin-top: 1rem;
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  color: #856404;
  text-align: center;
}

/* Button Styles */
.btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #0066CC;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0052A3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
  transform: translateY(-2px);
}

.btn-warning {
  background: #ff9800;
  color: white;
}

.btn-warning:hover {
  background: #e68900;
  transform: translateY(-2px);
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .processor-container {
    margin: 1rem;
    padding: 1rem;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>