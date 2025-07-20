<template>
  <div class="qr-display">
    <h2>QR-Code generiert!</h2>
    
    <div class="qr-success">
      <p class="success-message">
        ✅ Ihr Bundesmedikationsplan wurde erfolgreich erstellt
      </p>
    </div>

    <div class="qr-container">
      <div v-if="qrGenerationError" class="error-message">
        {{ qrGenerationError }}
      </div>
      <div v-else-if="!qrImageUrl" class="loading-message">
        QR-Code wird generiert...
      </div>
      <img 
        v-else
        :src="qrImageUrl" 
        alt="Bundesmedikationsplan QR-Code"
        class="qr-image"
      >
      <p v-if="qrImageUrl && !qrGenerationError" class="qr-info">
        Scanbar von allen deutschen Ärzten und Apotheken
      </p>
    </div>

    <div class="qr-data-preview">
      <h3>QR-Code Daten (BMP 2.6 XML Format)</h3>
      <pre class="qr-data">{{ formatXMLDisplay(qrData) }}</pre>
    </div>

    <div class="actions">
      <button @click="downloadQR" class="btn btn-primary">
        📥 QR-Code herunterladen
      </button>
      <button @click="copyToClipboard" class="btn btn-secondary">
        📋 Daten kopieren
      </button>
      <button @click="print" class="btn btn-secondary">
        🖨️ Drucken
      </button>
    </div>

    <div class="navigation">
      <button @click="$emit('back')" class="btn btn-outline">
        ← Zurück zur Bearbeitung
      </button>
      <button @click="$emit('new-scan')" class="btn btn-success">
        📷 Neuen Plan scannen
      </button>
    </div>

    <!-- Copy notification -->
    <div v-if="showCopyNotification" class="copy-notification">
      ✓ In Zwischenablage kopiert!
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  qrData: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['back', 'new-scan'])

const showCopyNotification = ref(false)
const qrImageUrl = ref('')
const qrGenerationError = ref('')

// Generate QR code locally
const generateQRCode = async () => {
  try {
    // Generate QR code with high error correction for medical data
    const options = {
      errorCorrectionLevel: 'H', // High error correction
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    }
    
    // Generate QR code as data URL
    const dataUrl = await QRCode.toDataURL(props.qrData, options)
    qrImageUrl.value = dataUrl
    qrGenerationError.value = ''
    
    console.log('QR Code generated locally. Data length:', props.qrData.length)
  } catch (error) {
    console.error('QR generation error:', error)
    qrGenerationError.value = 'Fehler bei der QR-Code Generierung: ' + error.message
  }
}

// Generate QR code when component mounts or data changes
onMounted(() => {
  generateQRCode()
})

// Watch for data changes
computed(() => {
  if (props.qrData) {
    generateQRCode()
  }
})

// Download QR code as image
const downloadQR = async () => {
  try {
    if (!qrImageUrl.value) {
      console.error('No QR code generated yet')
      return
    }
    
    // Convert data URL to blob
    const response = await fetch(qrImageUrl.value)
    const blob = await response.blob()
    
    // Create download link
    const link = document.createElement('a')
    link.href = qrImageUrl.value
    link.download = `medikationsplan-qr-${new Date().toISOString().split('T')[0]}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    console.log('QR Code downloaded successfully')
  } catch (error) {
    console.error('Download error:', error)
    alert('Fehler beim Herunterladen des QR-Codes')
  }
}

// Copy QR data to clipboard
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.qrData)
    showCopyNotification.value = true
    setTimeout(() => {
      showCopyNotification.value = false
    }, 2000)
  } catch (error) {
    console.error('Copy error:', error)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = props.qrData
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    
    showCopyNotification.value = true
    setTimeout(() => {
      showCopyNotification.value = false
    }, 2000)
  }
}

// Print function
const print = () => {
  window.print()
}

// Format XML for display (pretty print)
const formatXMLDisplay = (xml) => {
  try {
    // Add line breaks and indentation for readability
    return xml
      .replace(/></g, '>\n<')
      .replace(/<M\s/g, '\n  <M ')
      .replace(/<\/S>/g, '\n</S>')
  } catch (e) {
    return xml
  }
}
</script>

<style scoped>
.qr-display {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

h2 {
  color: #0066CC;
  margin-bottom: 1.5rem;
}

h3 {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.qr-success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
}

.success-message {
  color: #155724;
  font-weight: 500;
  margin: 0;
}

.qr-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.qr-image {
  max-width: 300px;
  width: 100%;
  height: auto;
  margin-bottom: 1rem;
}

.qr-info {
  color: #666;
  font-size: 0.875rem;
}

.qr-data-preview {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  text-align: left;
}

.qr-data {
  background: white;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.75rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.navigation {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  padding-top: 2rem;
  border-top: 1px solid #e0e0e0;
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

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-primary {
  background: #0066CC;
  color: white;
}

.btn-primary:hover {
  background: #0052A3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
}

.btn-outline {
  background: white;
  color: #0066CC;
  border: 2px solid #0066CC;
}

.btn-outline:hover {
  background: #0066CC;
  color: white;
}

.copy-notification {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #28a745;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateX(-50%) translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.error-message {
  color: #dc3545;
  padding: 1rem;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.loading-message {
  color: #666;
  padding: 2rem;
  font-style: italic;
}

/* Print styles */
@media print {
  .actions,
  .navigation,
  .qr-data-preview {
    display: none;
  }
  
  .qr-display {
    max-width: 100%;
  }
  
  .qr-container {
    box-shadow: none;
    border: 1px solid #ddd;
  }
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .actions,
  .navigation {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
  
  .qr-image {
    max-width: 250px;
  }
}
</style>