<template>
  <div class="camera-scanner">
    <!-- Modals -->
    <DocumentScanner 
      v-if="showScanner"
      :image-blob="capturedBlob"
      @processed="handleProcessedImage"
      @cancel="showScanner = false"
    />
    
    <OrientationCheck 
      v-if="showOrientationCheck"
      :image-blob="processedBlob || capturedBlob"
      @confirmed="handleOrientationConfirmed"
      @cancel="showOrientationCheck = false"
    />
    
    <ImageEditor 
      v-if="showEditor"
      :image-blob="orientedBlob || processedBlob || capturedBlob"
      @edited="handleEditedImage"
      @cancel="showEditor = false"
    />
    
    <!-- Main Scanner -->
    <div class="scanner-container">
      <!-- Video Stream -->
      <video 
        v-show="cameraActive" 
        ref="videoElement" 
        autoplay 
        playsinline
        class="video-stream"
      ></video>
      
      <!-- Canvas für Foto-Capture -->
      <canvas 
        v-show="!cameraActive && capturedImage" 
        ref="canvasElement"
        class="capture-canvas"
      ></canvas>
      
      <!-- Camera Tips -->
      <div v-if="cameraActive" class="camera-tips">
        <p>📱 Tipp: Halten Sie das Dokument im <strong>Hochformat</strong> und achten Sie auf gute Beleuchtung!</p>
      </div>
      
      <!-- Controls -->
      <div class="controls">
        <button 
          v-if="!cameraActive" 
          @click="startCamera"
          class="btn btn-primary"
        >
          Kamera starten
        </button>
        
        <button 
          v-if="cameraActive && !capturedImage" 
          @click="captureImage"
          class="btn btn-capture"
        >
          Foto aufnehmen
        </button>
        
        <div v-if="capturedImage" class="capture-actions">
          <button @click="retakePhoto" class="btn btn-secondary">
            Neu aufnehmen
          </button>
          <button @click="processImage" class="btn btn-primary">
            Verarbeiten
          </button>
        </div>
      </div>
      
      <!-- Error Messages -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import DocumentScanner from './DocumentScanner.vue'
import OrientationCheck from './OrientationCheck.vue'
import ImageEditor from './ImageEditor.vue'

const videoElement = ref(null)
const canvasElement = ref(null)
const cameraActive = ref(false)
const capturedImage = ref(null)
const capturedBlob = ref(null)
const processedBlob = ref(null)
const orientedBlob = ref(null)
const showScanner = ref(false)
const showOrientationCheck = ref(false)
const showEditor = ref(false)
const error = ref('')
const stream = ref(null)

const emit = defineEmits(['image-captured'])

const startCamera = async () => {
  try {
    error.value = ''
    
    // Request camera permission with landscape preference
    const constraints = {
      video: {
        facingMode: 'environment', // Use back camera
        width: { ideal: 2048, min: 1280 },
        height: { ideal: 1536, min: 720 },
        aspectRatio: { ideal: 4/3 }
      }
    }
    
    stream.value = await navigator.mediaDevices.getUserMedia(constraints)
    
    if (videoElement.value) {
      videoElement.value.srcObject = stream.value
      cameraActive.value = true
    }
  } catch (err) {
    console.error('Camera access error:', err)
    
    if (err.name === 'NotAllowedError') {
      error.value = 'Kamera-Zugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen.'
    } else if (err.name === 'NotFoundError') {
      error.value = 'Keine Kamera gefunden.'
    } else if (err.name === 'NotReadableError') {
      error.value = 'Kamera wird bereits von einer anderen Anwendung verwendet.'
    } else {
      error.value = 'Fehler beim Zugriff auf die Kamera.'
    }
  }
}

const captureImage = () => {
  if (!videoElement.value || !canvasElement.value) return
  
  const video = videoElement.value
  const canvas = canvasElement.value
  
  // Set canvas dimensions to match video
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  
  // Draw video frame to canvas
  const context = canvas.getContext('2d')
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  
  // Convert to blob
  canvas.toBlob(blob => {
    capturedImage.value = blob
    capturedBlob.value = blob
    stopCamera()
  }, 'image/jpeg', 0.9)
}

const retakePhoto = () => {
  capturedImage.value = null
  startCamera()
}

const processImage = () => {
  if (capturedImage.value) {
    // Show document scanner for perspective correction
    showScanner.value = true
  }
}

const handleProcessedImage = (processedImageBlob) => {
  showScanner.value = false
  processedBlob.value = processedImageBlob
  
  // Direkt an die Parent-Komponente weitergeben - keine weiteren Bearbeitungsschritte
  emit('image-captured', processedImageBlob)
}

const handleOrientationConfirmed = (orientedImageBlob) => {
  showOrientationCheck.value = false
  orientedBlob.value = orientedImageBlob
  
  // Show editor for additional adjustments
  showEditor.value = true
}

const handleEditedImage = (editedBlob) => {
  showEditor.value = false
  emit('image-captured', editedBlob)
}

const stopCamera = () => {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
    stream.value = null
  }
  cameraActive.value = false
}

// Cleanup on unmount
onUnmounted(() => {
  stopCamera()
})
</script>

<style scoped>
.camera-scanner {
  width: 100%;
  padding: 1rem;
}

.scanner-container {
  position: relative;
  background: #000;
  width: 100%;
  height: calc(100vh - 120px); /* Zurück zum Original */
  min-height: 400px;
  max-height: 760px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.video-stream,
.capture-canvas {
  width: 100%;
  height: calc(100% - 80px); /* Platz für Controls */
  object-fit: contain;
  display: block;
}

.controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.95);
  text-align: center;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.capture-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
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

.btn-capture {
  background: #28a745;
  color: white;
  font-size: 1.2rem;
  padding: 1rem 2rem;
}

.btn-capture:hover {
  background: #218838;
}

.camera-tips {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0.6rem 1.2rem;
  border-radius: 25px;
  font-size: 0.9rem;
  text-align: center;
  z-index: 10;
  white-space: nowrap;
}

.camera-tips strong {
  color: #4CAF50;
  font-weight: 700;
}

.error-message {
  position: absolute;
  bottom: 100px;
  left: 1rem;
  right: 1rem;
  padding: 1rem;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .camera-scanner {
    padding: 0.5rem;
  }
  
  .scanner-container {
    height: calc(100vh - 120px);
    min-height: 350px;
    max-height: 650px;
    border-radius: 8px;
  }
  
  .capture-actions {
    flex-direction: row;
    gap: 0.5rem;
  }
  
  .btn {
    flex: 1;
    padding: 0.6rem 1rem;
  }
  
  .camera-tips {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }
  
  .controls {
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  }
  
  .video-stream,
  .capture-canvas {
    border-radius: 8px;
  }
}
</style>