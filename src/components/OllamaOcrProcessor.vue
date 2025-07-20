<template>
  <div class="ollama-ocr-processor">
    <div class="processor-container">
      <!-- Processing Status -->
      <div v-if="processing" class="processing-status">
        <div class="spinner-large"></div>
        <h3>{{ statusMessage }}</h3>
        
        <!-- Progress Bar -->
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <p class="progress-text">{{ progressMessage }}</p>
        
        <!-- WebSocket Status -->
        <div v-if="wsConnected" class="ws-status">
          <span class="status-dot connected"></span>
          <span>Live-Verbindung aktiv</span>
        </div>
      </div>
      
      <!-- Results -->
      <div v-if="!processing && result" class="ocr-results">
        <h3>Medikationsplan erfasst</h3>
        
        <!-- Patient Information -->
        <div v-if="result.patient" class="patient-info">
          <h4>Patientendaten</h4>
          <div class="info-grid">
            <div v-if="result.patient.name" class="info-item">
              <span class="label">Name:</span>
              <span class="value">{{ result.patient.name }}</span>
            </div>
            <div v-if="result.patient.birthDate" class="info-item">
              <span class="label">Geburtsdatum:</span>
              <span class="value">{{ result.patient.birthDate }}</span>
            </div>
            <div v-if="result.patient.gender" class="info-item">
              <span class="label">Geschlecht:</span>
              <span class="value">{{ getGenderText(result.patient.gender) }}</span>
            </div>
            <div v-if="result.patient.address" class="info-item">
              <span class="label">Adresse:</span>
              <span class="value">{{ result.patient.address }}</span>
            </div>
          </div>
        </div>
        
        <!-- Medications List -->
        <div v-if="result.medications && result.medications.length > 0" class="medications-list">
          <h4>Medikamente ({{ result.medications.length }})</h4>
          <div v-for="(med, index) in result.medications" :key="index" class="medication-card">
            <div class="med-header">
              <span class="med-name">{{ med.name || 'Unbekanntes Medikament' }}</span>
              <span v-if="med.pzn" class="med-pzn">PZN: {{ med.pzn }}</span>
            </div>
            <div class="med-details">
              <div v-if="med.activeIngredient" class="detail-item">
                <span class="label">Wirkstoff:</span>
                <span>{{ med.activeIngredient }}</span>
              </div>
              <div v-if="med.strength" class="detail-item">
                <span class="label">Stärke:</span>
                <span>{{ med.strength }} {{ med.form || '' }}</span>
              </div>
              <div v-if="med.dosing" class="detail-item">
                <span class="label">Dosierung:</span>
                <span class="dosing">
                  {{ formatDosing(med.dosing) }} {{ med.unit || 'Stück' }}
                </span>
              </div>
              <div v-if="med.indication" class="detail-item">
                <span class="label">Anwendung:</span>
                <span>{{ med.indication }}</span>
              </div>
              <div v-if="med.notes" class="detail-item notes">
                <span class="label">Hinweise:</span>
                <span>{{ med.notes }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Doctor Information -->
        <div v-if="result.doctor && result.doctor.name" class="doctor-info">
          <h4>Ausgestellt von</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Arzt:</span>
              <span class="value">{{ result.doctor.name }}</span>
            </div>
            <div v-if="result.doctor.phone" class="info-item">
              <span class="label">Telefon:</span>
              <span class="value">{{ result.doctor.phone }}</span>
            </div>
            <div v-if="result.issueDate" class="info-item">
              <span class="label">Datum:</span>
              <span class="value">{{ result.issueDate }}</span>
            </div>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="action-buttons">
          <button @click="retry" class="btn btn-secondary">
            🔄 Erneut scannen
          </button>
          <button @click="editData" class="btn btn-secondary">
            ✏️ Daten bearbeiten
          </button>
          <button @click="confirm" class="btn btn-primary">
            ✓ Bestätigen & QR-Code erstellen
          </button>
        </div>
      </div>
      
      <!-- Error State -->
      <div v-if="error" class="error-state">
        <h3>❌ Fehler bei der Verarbeitung</h3>
        <p>{{ error }}</p>
        <div class="error-details" v-if="errorDetails">
          <pre>{{ errorDetails }}</pre>
        </div>
        <div class="error-actions">
          <button @click="retry" class="btn btn-secondary">
            🔄 Erneut versuchen
          </button>
          <button @click="useSimplifiedOcr" class="btn btn-warning">
            📝 Manuell erfassen
          </button>
          <button @click="cancel" class="btn btn-outline">
            ✗ Abbrechen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import ollamaOcrService from '../services/ollamaOcrService'

const props = defineProps({
  imageBlob: {
    type: Blob,
    required: true
  }
})

const emit = defineEmits(['completed', 'cancel', 'edit'])

// State
const processing = ref(false)
const result = ref(null)
const error = ref('')
const errorDetails = ref('')
const progress = ref(0)
const statusMessage = ref('Initialisierung...')
const progressMessage = ref('')
const wsConnected = ref(false)

// Helper functions
const getGenderText = (gender) => {
  const genderMap = {
    'm': 'Männlich',
    'w': 'Weiblich',
    'd': 'Divers'
  }
  return genderMap[gender?.toLowerCase()] || gender
}

const formatDosing = (dosing) => {
  if (!dosing) return '0-0-0-0'
  return `${dosing.morning || 0}-${dosing.noon || 0}-${dosing.evening || 0}-${dosing.night || 0}`
}

// WebSocket progress handler
const handleProgress = (data) => {
  wsConnected.value = true
  
  switch (data.type) {
    case 'ocr_start':
      progress.value = 10
      statusMessage.value = 'OCR-Verarbeitung gestartet...'
      progressMessage.value = data.message
      break
      
    case 'ocr_processing':
      progress.value = 50
      statusMessage.value = 'KI analysiert Medikationsplan...'
      progressMessage.value = data.message
      break
      
    case 'ocr_complete':
      progress.value = 90
      statusMessage.value = 'Verarbeitung abgeschlossen!'
      progressMessage.value = 'Daten werden aufbereitet...'
      if (data.data) {
        result.value = ollamaOcrService.formatMedicationData(data.data)
      }
      break
      
    case 'ocr_error':
      error.value = data.message
      errorDetails.value = data.error
      processing.value = false
      break
  }
}

// Start OCR processing
const startOcrProcessing = async () => {
  processing.value = true
  error.value = ''
  errorDetails.value = ''
  progress.value = 5
  statusMessage.value = 'Verbindung zum Server wird hergestellt...'
  
  try {
    // Check backend health first
    progressMessage.value = 'Prüfe Serververbindung...'
    const health = await ollamaOcrService.checkHealth()
    
    if (health.status !== 'healthy') {
      throw new Error('Backend-Server nicht erreichbar. Bitte stellen Sie sicher, dass Docker läuft.')
    }
    
    if (!health.modelAvailable) {
      throw new Error('KI-Modell nicht verfügbar. Bitte warten Sie, bis das Modell geladen ist.')
    }
    
    progress.value = 20
    statusMessage.value = 'Medikationsplan wird übertragen...'
    progressMessage.value = 'Bild wird hochgeladen...'
    
    // Process image with OCR
    const ocrResult = await ollamaOcrService.processImage(props.imageBlob, handleProgress)
    
    // Format and validate result
    result.value = ollamaOcrService.formatMedicationData(ocrResult)
    
    if (!ollamaOcrService.validateMedicationData(result.value)) {
      throw new Error('Ungültige Datenstruktur erkannt. Bitte versuchen Sie es erneut.')
    }
    
    progress.value = 100
    statusMessage.value = 'Erfolgreich verarbeitet!'
    progressMessage.value = `${result.value.medications?.length || 0} Medikamente erkannt`
    
    setTimeout(() => {
      processing.value = false
    }, 1000)
    
  } catch (err) {
    console.error('OCR processing failed:', err)
    error.value = err.message || 'Verarbeitung fehlgeschlagen'
    errorDetails.value = err.stack || ''
    processing.value = false
    wsConnected.value = false
  }
}

// Actions
const confirm = () => {
  if (result.value) {
    emit('completed', result.value)
  }
}

const retry = () => {
  result.value = null
  error.value = ''
  errorDetails.value = ''
  startOcrProcessing()
}

const editData = () => {
  if (result.value) {
    emit('edit', result.value)
  }
}

const useSimplifiedOcr = () => {
  // Fallback to manual entry
  emit('completed', {
    patient: {},
    medications: [],
    doctor: {},
    issueDate: new Date().toLocaleDateString('de-DE')
  })
}

const cancel = () => {
  ollamaOcrService.closeWebSocket()
  emit('cancel')
}

// Lifecycle
onMounted(() => {
  startOcrProcessing()
})

onUnmounted(() => {
  ollamaOcrService.closeWebSocket()
})
</script>

<style scoped>
.ollama-ocr-processor {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.processor-container {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}

/* Processing Status */
.processing-status {
  text-align: center;
  padding: 3rem 1rem;
}

.spinner-large {
  width: 60px;
  height: 60px;
  margin: 0 auto 2rem;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  margin: 2rem 0 1rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #2196F3;
  transition: width 0.3s ease;
}

.progress-text {
  color: #666;
  font-size: 0.9rem;
}

.ws-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  color: #666;
  font-size: 0.85rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
}

.status-dot.connected {
  background: #4CAF50;
  animation: pulse 2s infinite;
}

/* Results */
.ocr-results h3 {
  color: #333;
  margin-bottom: 1.5rem;
}

.patient-info,
.doctor-info {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.patient-info h4,
.doctor-info h4,
.medications-list h4 {
  margin: 0 0 1rem 0;
  color: #555;
  font-size: 1.1rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  gap: 0.5rem;
}

.info-item .label {
  font-weight: 600;
  color: #666;
}

.info-item .value {
  color: #333;
}

/* Medications */
.medications-list {
  margin-bottom: 2rem;
}

.medication-card {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.med-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
}

.med-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: #333;
}

.med-pzn {
  font-size: 0.85rem;
  color: #666;
  font-family: monospace;
}

.med-details {
  display: grid;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.detail-item .label {
  font-weight: 500;
  color: #666;
  min-width: 100px;
}

.dosing {
  font-family: monospace;
  font-weight: 600;
  color: #2196F3;
}

.notes {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed #ddd;
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
  color: #d32f2f;
  margin-bottom: 1rem;
}

.error-state p {
  color: #666;
  margin-bottom: 1rem;
}

.error-details {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
  text-align: left;
  font-size: 0.85rem;
  overflow-x: auto;
}

.error-details pre {
  margin: 0;
  white-space: pre-wrap;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-primary {
  background: #2196F3;
  color: white;
}

.btn-primary:hover {
  background: #1976D2;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #757575;
  color: white;
}

.btn-secondary:hover {
  background: #616161;
}

.btn-warning {
  background: #FF9800;
  color: white;
}

.btn-warning:hover {
  background: #F57C00;
}

.btn-outline {
  background: transparent;
  color: #666;
  border: 1px solid #ddd;
}

.btn-outline:hover {
  background: #f5f5f5;
}

/* Animations */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* Responsive */
@media (max-width: 600px) {
  .processor-container {
    padding: 1rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>