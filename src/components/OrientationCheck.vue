<template>
  <div class="orientation-check">
    <div class="check-container">
      <!-- Preview Canvas -->
      <canvas 
        ref="canvas"
        class="preview-canvas"
      ></canvas>
      
      <!-- Quick OCR Test Result -->
      <div v-if="ocrTestResult" class="ocr-test-result">
        <div class="test-info">
          <span class="label">Text-Erkennung:</span>
          <span :class="['confidence', confidenceClass]">
            {{ Math.round(ocrTestResult.confidence) }}%
          </span>
        </div>
        <div v-if="ocrTestResult.orientation" class="orientation-info">
          <span class="label">Erkannte Ausrichtung:</span>
          <span class="value">{{ orientationLabel }}</span>
        </div>
      </div>
      
      <!-- Rotation Controls -->
      <div class="rotation-controls">
        <button @click="rotate(-90)" class="btn btn-rotate">
          <span class="icon">↶</span>
          <span>90° Links</span>
        </button>
        
        <button @click="rotate(180)" class="btn btn-rotate">
          <span class="icon">↻</span>
          <span>180°</span>
        </button>
        
        <button @click="rotate(90)" class="btn btn-rotate">
          <span class="icon">↷</span>
          <span>90° Rechts</span>
        </button>
      </div>
      
      <!-- Action Buttons -->
      <div class="action-controls">
        <button @click="testOrientation" class="btn btn-secondary" :disabled="testing">
          🔍 {{ testing ? 'Teste...' : 'OCR Test' }}
        </button>
        
        <button @click="cancel" class="btn btn-secondary">
          ✗ Zurück
        </button>
        
        <button @click="confirm" class="btn btn-primary">
          ✓ Weiter zur Texterkennung
        </button>
      </div>
      
      <!-- Info Text -->
      <div class="info-text">
        <p>🔄 Drehen Sie das Bild so, dass der Text normal lesbar ist</p>
        <p class="hint">Tipp: Klicken Sie auf "OCR Test" für eine Vorschau der Texterkennung</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import ocrService from '../services/ocrService'

const props = defineProps({
  imageBlob: Blob
})

const emit = defineEmits(['confirmed', 'cancel'])

// Refs
const canvas = ref(null)
const currentRotation = ref(0)
const ocrTestResult = ref(null)
const testing = ref(false)

// Image data
let image = null
let ctx = null

// Computed
const orientationLabel = computed(() => {
  if (!ocrTestResult.value?.orientation) return 'Unbekannt'
  
  const angle = ocrTestResult.value.orientation
  if (angle === 0) return 'Hochformat ↑'
  if (angle === 90) return 'Querformat →'
  if (angle === 180) return 'Kopfüber ↓'
  if (angle === 270) return 'Querformat ←'
  return `${angle}°`
})

const confidenceClass = computed(() => {
  if (!ocrTestResult.value) return ''
  const conf = ocrTestResult.value.confidence
  if (conf > 80) return 'high'
  if (conf > 50) return 'medium'
  return 'low'
})

// Lifecycle
onMounted(() => {
  loadImage()
})

// Load and display image
const loadImage = async () => {
  const url = URL.createObjectURL(props.imageBlob)
  image = new Image()
  
  image.onload = () => {
    const cnv = canvas.value
    ctx = cnv.getContext('2d')
    
    // Calculate size to fit
    const maxWidth = window.innerWidth * 0.8
    const maxHeight = window.innerHeight * 0.5
    
    const scale = Math.min(
      maxWidth / image.width,
      maxHeight / image.height,
      1
    )
    
    cnv.width = image.width * scale
    cnv.height = image.height * scale
    
    drawImage()
    URL.revokeObjectURL(url)
    
    // Automatic initial test
    setTimeout(() => {
      testOrientation()
    }, 500)
  }
  
  image.src = url
}

// Draw image with current rotation
const drawImage = () => {
  if (!ctx || !image) return
  
  const cnv = canvas.value
  ctx.clearRect(0, 0, cnv.width, cnv.height)
  
  ctx.save()
  
  // Apply rotation
  ctx.translate(cnv.width / 2, cnv.height / 2)
  ctx.rotate((currentRotation.value * Math.PI) / 180)
  
  // Adjust translation based on rotation
  if (currentRotation.value === 90 || currentRotation.value === 270) {
    // Swap dimensions for 90/270 degree rotations
    ctx.translate(-cnv.height / 2, -cnv.width / 2)
    ctx.drawImage(image, 0, 0, cnv.height, cnv.width)
  } else {
    ctx.translate(-cnv.width / 2, -cnv.height / 2)
    ctx.drawImage(image, 0, 0, cnv.width, cnv.height)
  }
  
  ctx.restore()
}

// Rotate image
const rotate = (degrees) => {
  currentRotation.value = (currentRotation.value + degrees + 360) % 360
  drawImage()
  ocrTestResult.value = null // Clear previous test result
}

// Test OCR on current orientation
const testOrientation = async () => {
  testing.value = true
  
  try {
    // Get rotated image blob
    const rotatedBlob = await getRotatedBlob()
    
    // Quick OCR test (only first 500ms)
    const testPromise = ocrService.recognizeText(rotatedBlob)
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => resolve({ text: '', confidence: 0 }), 500)
    )
    
    const result = await Promise.race([testPromise, timeoutPromise])
    
    // Extract sample text
    const sampleText = result.text.substring(0, 100).trim()
    
    ocrTestResult.value = {
      confidence: result.confidence || 0,
      sampleText: sampleText,
      orientation: currentRotation.value,
      hasText: sampleText.length > 10
    }
    
  } catch (error) {
    console.error('OCR test failed:', error)
    ocrTestResult.value = {
      confidence: 0,
      error: true
    }
  } finally {
    testing.value = false
  }
}

// Get rotated image as blob
const getRotatedBlob = () => {
  return new Promise((resolve) => {
    const outputCanvas = document.createElement('canvas')
    const outputCtx = outputCanvas.getContext('2d')
    
    // Set dimensions based on rotation
    if (currentRotation.value === 90 || currentRotation.value === 270) {
      outputCanvas.width = image.height
      outputCanvas.height = image.width
    } else {
      outputCanvas.width = image.width
      outputCanvas.height = image.height
    }
    
    // Apply rotation
    outputCtx.save()
    outputCtx.translate(outputCanvas.width / 2, outputCanvas.height / 2)
    outputCtx.rotate((currentRotation.value * Math.PI) / 180)
    
    if (currentRotation.value === 90 || currentRotation.value === 270) {
      outputCtx.drawImage(image, -image.width / 2, -image.height / 2)
    } else {
      outputCtx.drawImage(image, -image.width / 2, -image.height / 2)
    }
    
    outputCtx.restore()
    
    outputCanvas.toBlob(resolve, 'image/jpeg', 0.95)
  })
}

// Confirm and proceed
const confirm = async () => {
  const rotatedBlob = await getRotatedBlob()
  emit('confirmed', rotatedBlob)
}

const cancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.orientation-check {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
}

.check-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  max-width: 100%;
  max-height: 100%;
}

.preview-canvas {
  border: 2px solid #444;
  border-radius: 8px;
  max-width: 100%;
  max-height: 50vh;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.ocr-test-result {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  min-width: 300px;
}

.test-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.orientation-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  color: #aaa;
  font-size: 0.9rem;
}

.confidence {
  font-weight: bold;
  font-size: 1.2rem;
}

.confidence.high {
  color: #4CAF50;
}

.confidence.medium {
  color: #FFC107;
}

.confidence.low {
  color: #f44336;
}

.value {
  color: white;
  font-weight: 500;
}

.rotation-controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-rotate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 1rem;
  min-width: 80px;
}

.btn-rotate .icon {
  font-size: 2rem;
}

.action-controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.info-text {
  text-align: center;
  color: #ccc;
  max-width: 500px;
}

.info-text p {
  margin: 0.5rem 0;
}

.hint {
  font-size: 0.85rem;
  opacity: 0.8;
}

.btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
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

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
  transform: translateY(-2px);
}

.btn-rotate {
  background: #495057;
  color: white;
}

.btn-rotate:hover {
  background: #343a40;
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .check-container {
    padding: 1rem;
    gap: 1rem;
  }
  
  .rotation-controls {
    gap: 0.5rem;
  }
  
  .btn {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }
  
  .btn-rotate {
    min-width: 70px;
    padding: 0.8rem;
  }
  
  .btn-rotate .icon {
    font-size: 1.5rem;
  }
}
</style>