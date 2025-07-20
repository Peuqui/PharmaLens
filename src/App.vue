<template>
  <div id="app">
    <header class="app-header">
      <h1>PharmaLens</h1>
      <p class="subtitle">Medikamentenpläne digitalisieren</p>
    </header>
    
    <!-- Debug Button -->
    <button @click="showDebug = !showDebug" class="debug-toggle" title="Debug Console">
      🐛
    </button>
    
    <!-- Debug Console -->
    <DebugConsole v-if="showDebug" :show-debug="showDebug" @close="showDebug = false" />

    <!-- Neu starten Button - immer sichtbar außer beim Scanner -->
    <div v-if="currentView !== 'scanner'" class="restart-container">
      <button @click="startNewScan" class="btn btn-restart">
        🔄 Neu starten
      </button>
    </div>

    <main class="app-main">
      <!-- Scanner View -->
      <div v-if="currentView === 'scanner'" class="view-container">
        <CameraScanner @image-captured="handleImageCapture" />
      </div>

      <!-- OCR Processing View -->
      <OllamaOcrProcessor 
        v-if="currentView === 'processing'"
        :image-blob="capturedImage"
        @completed="handleOcrCompleted"
        @cancel="currentView = 'scanner'"
        @edit="handleOcrEdit"
      />

      <!-- Results View -->
      <div v-if="currentView === 'results'" class="view-container">
        <MedicationPlan 
          :patient-info="patientInfo" 
          :medications="medications"
          :ocr-text="ocrText"
          @edit="handleEdit"
          @generate-qr="generateQRCode"
        />
      </div>

      <!-- QR Code View -->
      <div v-if="currentView === 'qrcode'" class="view-container">
        <QRCodeDisplay 
          :qr-data="qrData"
          @back="currentView = 'results'"
          @new-scan="startNewScan"
        />
      </div>
    </main>

    <!-- Error Modal -->
    <div v-if="error" class="error-modal" @click="error = ''">
      <div class="error-content">
        <h3>Fehler</h3>
        <p>{{ error }}</p>
        <button @click="error = ''" class="btn btn-primary">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import CameraScanner from './components/CameraScanner.vue'
import OllamaOcrProcessor from './components/OllamaOcrProcessor.vue'
import MedicationPlan from './components/MedicationPlan.vue'
import QRCodeDisplay from './components/QRCodeDisplay.vue'
import DebugConsole from './components/DebugConsole.vue'
import { generateBMP26XML } from './utils/bmp26Generator.js'

// Reactive state
const currentView = ref('scanner')
const capturedImage = ref(null)
const ocrText = ref('')
const patientInfo = ref({})
const medications = ref([])
const qrData = ref('')
const error = ref('')
const showDebug = ref(false)

// Initialize multi-OCR service
onMounted(async () => {
  try {
    await multiOcrService.initialize()
  } catch (err) {
    console.error('Multi-OCR initialization error:', err)
    // Service will initialize when needed
  }
})

// Handle image capture from camera
const handleImageCapture = async (imageBlob) => {
  capturedImage.value = imageBlob
  currentView.value = 'processing'
}

// Handle OCR completion
const handleOcrCompleted = (result) => {
  ocrText.value = result.text
  
  // Use extracted medications if available
  if (result.medications && result.medications.length > 0) {
    medications.value = result.medications.map(med => ({
      activeIngredient: med.name,
      name: med.name,
      strength: med.strength,
      form: med.unit || 'Tablette',
      dosage: med.dosage ? `${med.dosage.morning}-${med.dosage.noon}-${med.dosage.evening}` : '',
      instructions: ''
    }))
  } else {
    // Fallback to simple parsing
    medications.value = parseMedicationsFromText(result.text)
  }
  
  // Extract patient info
  patientInfo.value = parsePatientInfoFromText(result.text)
  
  currentView.value = 'results'
}

// Handle OCR edit request
const handleOcrEdit = (result) => {
  // Show results view with editable text
  ocrText.value = result.text
  medications.value = result.medications || []
  patientInfo.value = {}
  currentView.value = 'results'
}

// Simple medication parser
const parseMedicationsFromText = (text) => {
  // Basic parsing logic
  const lines = text.split('\n').filter(line => line.trim())
  const meds = []
  
  for (const line of lines) {
    if (line.match(/\d+\s*(mg|ml|Stk)/i)) {
      meds.push({
        activeIngredient: line,
        name: line,
        strength: '',
        form: 'Tablette',
        dosage: '',
        instructions: ''
      })
    }
  }
  
  return meds.length > 0 ? meds : [{
    activeIngredient: '',
    name: '',
    strength: '',
    form: 'Tablette',
    dosage: '',
    instructions: ''
  }]
}

// Simple patient info parser
const parsePatientInfoFromText = (text) => {
  // Basic parsing logic
  const info = {
    name: '',
    birthDate: '',
    address: ''
  }
  
  // Try to find patient name
  const nameMatch = text.match(/Name:\s*(.+)/i)
  if (nameMatch) info.name = nameMatch[1].trim()
  
  // Try to find birth date
  const dateMatch = text.match(/(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})/)
  if (dateMatch) info.birthDate = dateMatch[1]
  
  return info
}

// Handle manual edits
const handleEdit = ({ medications: meds, patientInfo: info }) => {
  medications.value = meds
  patientInfo.value = info
}

// Generate QR code
const generateQRCode = () => {
  try {
    // Generate BMP 2.6 XML data
    const xmlData = generateBMP26XML(patientInfo.value, medications.value)
    
    // For QR code, we need to encode the XML properly
    qrData.value = xmlData
    currentView.value = 'qrcode'
  } catch (err) {
    console.error('QR generation error:', err)
    error.value = 'Fehler bei der QR-Code Generierung.'
  }
}


// Start new scan
const startNewScan = () => {
  // Reset all data
  capturedImage.value = null
  ocrText.value = ''
  patientInfo.value = {}
  medications.value = []
  qrData.value = ''
  currentView.value = 'scanner'
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #333;
  background: #f5f5f5;
  overflow: hidden;
  margin: 0;
  padding: 0;
  height: 100vh;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: #0066CC;
  color: white;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.subtitle {
  font-size: 1rem;
  opacity: 0.9;
}

.app-main {
  flex: 1;
  padding: 0;
  max-width: 100%;
  margin: 0;
  width: 100%;
}

.restart-container {
  position: fixed;
  top: 100px;
  right: 20px;
  z-index: 100;
}

.btn-restart {
  background: #ff6b6b;
  color: white;
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 25px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  transition: all 0.3s ease;
}

.btn-restart:hover {
  background: #ff5252;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
}

.debug-toggle {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #333;
  color: white;
  border: none;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  z-index: 9998;
  transition: all 0.3s ease;
}

.debug-toggle:hover {
  background: #555;
  transform: scale(1.1);
}

@media (max-width: 768px) {
  .restart-container {
    top: 80px;
    right: 10px;
  }
  
  .btn-restart {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }
}

.view-container {
  background: white;
  border-radius: 8px;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-top: 0.5rem;
  width: 100%;
}

.processing-status {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #0066CC;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress {
  font-size: 2rem;
  font-weight: 600;
  color: #0066CC;
  margin-top: 1rem;
}

.error-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.error-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.error-content h3 {
  color: #dc3545;
  margin-bottom: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #0066CC;
  color: white;
}

.btn-primary:hover {
  background: #0052A3;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .app-header {
    padding: 0.75rem;
  }
  
  .app-header h1 {
    font-size: 1.5rem;
  }
  
  .subtitle {
    font-size: 0.875rem;
  }
  
  .app-main {
    padding: 0;
  }
  
  .view-container {
    margin: 0;
    padding: 0;
    border-radius: 0;
    box-shadow: none;
  }
}
</style>