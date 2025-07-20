<template>
  <div class="document-scanner">
    <!-- Transform Preview -->
    <TransformPreview 
      v-if="showPreview && transformedImage"
      :imageBlob="transformedImage"
      @confirm="confirmTransform"
      @retry="retryTransform"
    />
    
    <div class="scanner-container" v-show="!showPreview">
      <!-- Loading overlay -->
      <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>{{ loadingMessage }}</p>
        <div v-if="processingProgress > 0" class="progress-bar">
          <div class="progress-fill" :style="{ width: processingProgress + '%' }"></div>
        </div>
      </div>

      <!-- Canvas for display -->
      <canvas 
        ref="canvas"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        class="scan-canvas"
      ></canvas>
      
      <!-- Magnifier/Lupe -->
      <div 
        v-if="showMagnifier" 
        class="magnifier"
        :style="magnifierStyle"
      >
        <canvas ref="magnifierCanvas" :width="magnifierSize" :height="magnifierSize"></canvas>
        <div class="magnifier-crosshair"></div>
      </div>
      
      <!-- Controls -->
      <div class="scan-controls">
        <div class="control-group">
          <button @click="autoDetect" class="btn btn-primary" :disabled="loading">
            🔍 Auto-Erkennung
          </button>
          <button @click="resetCorners" class="btn btn-secondary">
            ↺ Zurücksetzen
          </button>
        </div>
        
        <div class="control-group">
          <button @click="cancel" class="btn btn-secondary">
            ✗ Abbrechen
          </button>
          <button @click="applyPerspective" class="btn btn-success" :disabled="!hasValidCorners">
            ✓ Entzerren & Weiter
          </button>
        </div>
      </div>
      
      <div class="scan-info">
        <p v-if="!documentDetected">📷 Positionieren Sie die 4 Ecken des Dokuments</p>
        <p v-else class="success">✅ Dokument erkannt! Ecken anpassen oder fortfahren</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import imageProcessingService from '../services/imageProcessingService'
import TransformPreview from './TransformPreview.vue'

const props = defineProps({
  imageBlob: Blob
})

const emit = defineEmits(['processed', 'cancel'])

// Refs
const canvas = ref(null)
const loading = ref(false)
const loadingMessage = ref('')
const processingProgress = ref(0)
const documentDetected = ref(false)
const showPreview = ref(false)
const transformedImage = ref(null)

// Magnifier state
const magnifierCanvas = ref(null)
const showMagnifier = ref(false)
const magnifierSize = 150
const magnifierZoom = 3
const magnifierOffset = { x: -100, y: -150 } // Offset from finger
const magnifierPosition = ref({ x: 0, y: 0 })

// Image and canvas context
let ctx = null
let image = null
let scale = 1

// Corner points
const corners = ref([
  { x: 100, y: 100 },
  { x: 400, y: 100 },
  { x: 400, y: 300 },
  { x: 100, y: 300 }
])

// Dragging state
let isDragging = false
let dragIndex = -1
let dragType = 'corner' // 'corner' or 'edge'
let dragEdgeIndex = -1
let dragStartPos = null
let dragStartCorners = null
const HANDLE_RADIUS = 15
const EDGE_THRESHOLD = 20 // Distance from edge to trigger edge dragging

// Computed
const hasValidCorners = computed(() => {
  return corners.value.length === 4
})

const magnifierStyle = computed(() => ({
  left: `${magnifierPosition.value.x}px`,
  top: `${magnifierPosition.value.y}px`,
  width: `${magnifierSize}px`,
  height: `${magnifierSize}px`
}))

// Lifecycle
onMounted(async () => {
  await initializeOpenCV()
  if (props.imageBlob) {
    await loadImage()
    // Automatisch Dokument erkennen beim Start
    setTimeout(() => {
      autoDetect()
    }, 500)
  }
})

// Initialize OpenCV
const initializeOpenCV = async () => {
  if (!imageProcessingService.isReady.value) {
    loading.value = true
    loadingMessage.value = 'Lade Bildverarbeitung...'
    
    try {
      await imageProcessingService.initialize()
      loadingMessage.value = ''
      loading.value = false
    } catch (error) {
      console.error('Failed to initialize OpenCV:', error)
      loadingMessage.value = 'Bildverarbeitung nicht verfügbar - Bitte manuell anpassen'
      
      // Allow manual adjustment even if OpenCV fails
      setTimeout(() => {
        loading.value = false
        // Initialize with default corners
        const margin = 50
        const cnv = canvas.value
        if (cnv) {
          corners.value = [
            { x: margin, y: margin },
            { x: cnv.width - margin, y: margin },
            { x: cnv.width - margin, y: cnv.height - margin },
            { x: margin, y: cnv.height - margin }
          ]
          drawImage()
        }
      }, 2000)
    }
  }
}

// Load and display image
const loadImage = async () => {
  const url = URL.createObjectURL(props.imageBlob)
  image = new Image()
  
  return new Promise((resolve) => {
    image.onload = () => {
      const cnv = canvas.value
      ctx = cnv.getContext('2d')
      
      // Calculate scale to fit canvas
      const maxWidth = window.innerWidth * 0.9
      const maxHeight = window.innerHeight * 0.6
      
      scale = Math.min(
        maxWidth / image.width,
        maxHeight / image.height,
        1
      )
      
      cnv.width = image.width * scale
      cnv.height = image.height * scale
      
      // Initialize corners to cover most of the image
      const margin = 50
      corners.value = [
        { x: margin, y: margin },
        { x: cnv.width - margin, y: margin },
        { x: cnv.width - margin, y: cnv.height - margin },
        { x: margin, y: cnv.height - margin }
      ]
      
      drawImage()
      URL.revokeObjectURL(url)
      resolve()
    }
    
    image.src = url
  })
}

// Draw image with corner overlay
const drawImage = () => {
  if (!ctx || !image) return
  
  // Clear and draw image
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  ctx.drawImage(image, 0, 0, canvas.value.width, canvas.value.height)
  
  // Darken outside area
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height)
  
  // Clear inside selected area
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(corners.value[0].x, corners.value[0].y)
  for (let i = 1; i < 4; i++) {
    ctx.lineTo(corners.value[i].x, corners.value[i].y)
  }
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(image, 0, 0, canvas.value.width, canvas.value.height)
  ctx.restore()
  
  // Draw corner lines (edges)
  ctx.strokeStyle = '#00ff00'
  ctx.lineWidth = 3
  ctx.setLineDash([])
  
  // Draw each edge with highlighting on hover
  for (let i = 0; i < 4; i++) {
    const nextI = (i + 1) % 4
    ctx.beginPath()
    ctx.moveTo(corners.value[i].x, corners.value[i].y)
    ctx.lineTo(corners.value[nextI].x, corners.value[nextI].y)
    
    // Highlight edge if hovering
    if (isDragging && dragType === 'edge' && dragEdgeIndex === i) {
      ctx.strokeStyle = '#ffff00'
      ctx.lineWidth = 5
    } else {
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 3
    }
    ctx.stroke()
  }
  
  // Draw corner handles
  ctx.setLineDash([])
  corners.value.forEach((corner, index) => {
    // Highlight active corner
    if (isDragging && dragType === 'corner' && dragIndex === index) {
      ctx.fillStyle = '#ffff00'
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 3
    } else {
      ctx.fillStyle = '#00ff00'
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
    }
    
    ctx.beginPath()
    ctx.arc(corner.x, corner.y, HANDLE_RADIUS, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()
    
    // Draw corner labels with background for better visibility
    const label = index + 1
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Draw background circle for number
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.beginPath()
    ctx.arc(corner.x, corner.y - 30, 12, 0, 2 * Math.PI)
    ctx.fill()
    
    // Draw number
    ctx.fillStyle = '#fff'
    ctx.fillText(label, corner.x, corner.y - 30)
    
    // Add descriptive label
    const labels = ['Oben Links', 'Oben Rechts', 'Unten Rechts', 'Unten Links']
    ctx.font = '12px Arial'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(corner.x - 40, corner.y + 20, 80, 20)
    ctx.fillStyle = '#fff'
    ctx.fillText(labels[index], corner.x, corner.y + 30)
  })
}

// Auto-detect document
const autoDetect = async () => {
  // Check if OpenCV is available
  if (!imageProcessingService.isReady.value) {
    loadingMessage.value = 'Bildverarbeitung wird geladen...'
    loading.value = true
    
    try {
      await initializeOpenCV()
    } catch (error) {
      console.warn('OpenCV not available, skipping auto-detect')
      return
    }
  }
  
  loading.value = true
  loadingMessage.value = 'Suche Dokument...'
  processingProgress.value = 20
  
  try {
    const result = await imageProcessingService.detectDocument(props.imageBlob)
    processingProgress.value = 80
    
    if (result.success && result.corners) {
      // Scale corners to canvas size
      corners.value = result.corners.map(corner => ({
        x: corner.x * scale,
        y: corner.y * scale
      }))
      documentDetected.value = true
      loadingMessage.value = 'Dokument gefunden!'
    } else {
      loadingMessage.value = 'Kein Dokument erkannt - bitte manuell anpassen'
      documentDetected.value = false
    }
    
    drawImage()
    processingProgress.value = 100
    
    setTimeout(() => {
      loading.value = false
      processingProgress.value = 0
    }, 500)
    
  } catch (error) {
    console.error('Document detection failed:', error)
    loadingMessage.value = 'Auto-Erkennung fehlgeschlagen - bitte manuell anpassen'
    documentDetected.value = false
    processingProgress.value = 0
    
    setTimeout(() => {
      loading.value = false
    }, 1500)
  }
}

// Apply perspective transform
const applyPerspective = async () => {
  // If OpenCV is not available, just pass through the original image
  if (!imageProcessingService.isReady.value) {
    console.warn('OpenCV not available, passing through original image')
    emit('processed', props.imageBlob)
    return
  }
  
  loading.value = true
  loadingMessage.value = 'Entzerren...'
  processingProgress.value = 30
  
  try {
    // Scale corners back to original image size
    const originalCorners = corners.value.map(corner => ({
      x: corner.x / scale,
      y: corner.y / scale
    }))
    
    // Debug: Log die Eckpunkte
    console.log('Canvas corners:', corners.value)
    console.log('Original image corners:', originalCorners)
    console.log('Scale factor:', scale)
    
    processingProgress.value = 60
    const transformedBlob = await imageProcessingService.perspectiveTransform(
      props.imageBlob, 
      originalCorners
    )
    
    processingProgress.value = 90
    
    // Zeige Vorschau statt direkt weiterzugehen
    transformedImage.value = transformedBlob
    loading.value = false
    showPreview.value = true
    
  } catch (error) {
    console.error('Perspective transform failed:', error)
    loadingMessage.value = 'Entzerrung fehlgeschlagen - verwende Original-Bild'
    processingProgress.value = 80
    
    // Bei Fehler: Automatisch mit Original-Bild fortfahren
    setTimeout(async () => {
      loadingMessage.value = 'Optimiere Original-Bild für Texterkennung...'
      
      try {
        // Versuche wenigstens das Bild für OCR zu optimieren
        const enhancedBlob = await imageProcessingService.enhanceForOCR(props.imageBlob)
        processingProgress.value = 100
        loadingMessage.value = 'Bild optimiert - fahre fort...'
        
        setTimeout(() => {
          emit('processed', enhancedBlob)
        }, 500)
      } catch (enhanceError) {
        console.warn('Image enhancement failed, using original:', enhanceError)
        // Wenn auch das fehlschlägt, verwende Original
        processingProgress.value = 100
        loadingMessage.value = 'Verwende Original-Bild...'
        
        setTimeout(() => {
          emit('processed', props.imageBlob)
        }, 500)
      }
    }, 1000)
  }
}

// Preview handlers
const confirmTransform = async () => {
  if (!transformedImage.value) return
  
  loading.value = true
  loadingMessage.value = 'Optimiere für Texterkennung...'
  processingProgress.value = 20
  
  try {
    // First, detect and mask QR codes
    loadingMessage.value = 'Erkenne QR-Codes...'
    const qrMasked = await imageProcessingService.detectAndMaskQRCodes(transformedImage.value)
    processingProgress.value = 50
    
    if (qrMasked.qrRegions.length > 0) {
      console.log(`Masked ${qrMasked.qrRegions.length} QR code(s)`)
    }
    
    // Then enhance for OCR
    loadingMessage.value = 'Optimiere für Texterkennung...'
    const enhancedBlob = await imageProcessingService.enhanceForOCR(qrMasked.blob)
    processingProgress.value = 100
    
    // Clean up
    transformedImage.value = null
    showPreview.value = false
    
    emit('processed', enhancedBlob)
  } catch (error) {
    console.error('Enhancement failed:', error)
    // Use transformed image without enhancement
    emit('processed', transformedImage.value)
  }
}

const retryTransform = () => {
  // Reset to scanner view
  showPreview.value = false
  transformedImage.value = null
  loading.value = false
  processingProgress.value = 0
}

// Magnifier functions
const updateMagnifier = (mousePos) => {
  if (!magnifierCanvas.value || !image) return
  
  const mCtx = magnifierCanvas.value.getContext('2d')
  const rect = canvas.value.getBoundingClientRect()
  
  // Calculate position with offset (relative to viewport)
  magnifierPosition.value = {
    x: mousePos.x + rect.left + magnifierOffset.x,
    y: mousePos.y + rect.top + magnifierOffset.y
  }
  
  // Clear magnifier
  mCtx.clearRect(0, 0, magnifierSize, magnifierSize)
  
  // Calculate source position on original image
  const canvasX = mousePos.x
  const canvasY = mousePos.y
  const sourceX = (canvasX / scale) - (magnifierSize / (2 * magnifierZoom * scale))
  const sourceY = (canvasY / scale) - (magnifierSize / (2 * magnifierZoom * scale))
  const sourceSize = magnifierSize / (magnifierZoom * scale)
  
  // Draw circular mask
  mCtx.save()
  mCtx.beginPath()
  mCtx.arc(magnifierSize/2, magnifierSize/2, magnifierSize/2, 0, 2 * Math.PI)
  mCtx.clip()
  
  // Draw magnified image
  mCtx.drawImage(
    image,
    sourceX, sourceY, sourceSize, sourceSize,
    0, 0, magnifierSize, magnifierSize
  )
  
  // Draw border
  mCtx.strokeStyle = '#0066CC'
  mCtx.lineWidth = 3
  mCtx.stroke()
  
  mCtx.restore()
}

// Mouse/Touch handling
const getMousePos = (e) => {
  const rect = canvas.value.getBoundingClientRect()
  return {
    x: (e.clientX || e.touches[0].clientX) - rect.left,
    y: (e.clientY || e.touches[0].clientY) - rect.top
  }
}

const findNearestCorner = (pos) => {
  let minDist = Infinity
  let nearestIndex = -1
  
  corners.value.forEach((corner, index) => {
    const dist = Math.sqrt(
      Math.pow(pos.x - corner.x, 2) + 
      Math.pow(pos.y - corner.y, 2)
    )
    if (dist < HANDLE_RADIUS * 2 && dist < minDist) {
      minDist = dist
      nearestIndex = index
    }
  })
  
  return nearestIndex
}

// Find nearest edge
const findNearestEdge = (pos) => {
  let minDist = Infinity
  let nearestEdge = -1
  
  for (let i = 0; i < 4; i++) {
    const nextI = (i + 1) % 4
    const p1 = corners.value[i]
    const p2 = corners.value[nextI]
    
    // Calculate distance from point to line segment
    const dist = distanceToLineSegment(pos, p1, p2)
    
    if (dist < EDGE_THRESHOLD && dist < minDist) {
      minDist = dist
      nearestEdge = i
    }
  }
  
  return nearestEdge
}

// Calculate distance from point to line segment
const distanceToLineSegment = (point, lineStart, lineEnd) => {
  const A = point.x - lineStart.x
  const B = point.y - lineStart.y
  const C = lineEnd.x - lineStart.x
  const D = lineEnd.y - lineStart.y
  
  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1
  
  if (lenSq !== 0) {
    param = dot / lenSq
  }
  
  let xx, yy
  
  if (param < 0) {
    xx = lineStart.x
    yy = lineStart.y
  } else if (param > 1) {
    xx = lineEnd.x
    yy = lineEnd.y
  } else {
    xx = lineStart.x + param * C
    yy = lineStart.y + param * D
  }
  
  const dx = point.x - xx
  const dy = point.y - yy
  
  return Math.sqrt(dx * dx + dy * dy)
}

const handleMouseDown = (e) => {
  const pos = getMousePos(e)
  
  // Store start position and corners
  dragStartPos = { ...pos }
  dragStartCorners = corners.value.map(c => ({ ...c }))
  
  // Check for corner first (higher priority)
  dragIndex = findNearestCorner(pos)
  if (dragIndex !== -1) {
    isDragging = true
    dragType = 'corner'
    showMagnifier.value = true
    updateMagnifier(pos)
    return
  }
  
  // Then check for edge
  dragEdgeIndex = findNearestEdge(pos)
  if (dragEdgeIndex !== -1) {
    isDragging = true
    dragType = 'edge'
  }
}

const handleMouseMove = (e) => {
  const pos = getMousePos(e)
  
  if (isDragging) {
    if (dragType === 'corner' && dragIndex !== -1) {
      // Move single corner
      corners.value[dragIndex] = pos
      drawImage()
      // Update magnifier position
      updateMagnifier(pos)
    } else if (dragType === 'edge' && dragEdgeIndex !== -1) {
      // Move edge (two corners)
      const nextIndex = (dragEdgeIndex + 1) % 4
      
      // Get original edge positions
      const origP1 = dragStartCorners[dragEdgeIndex]
      const origP2 = dragStartCorners[nextIndex]
      
      // Calculate edge vector and perpendicular
      const edgeVector = { x: origP2.x - origP1.x, y: origP2.y - origP1.y }
      const edgeLength = Math.sqrt(edgeVector.x * edgeVector.x + edgeVector.y * edgeVector.y)
      
      if (edgeLength > 0) {
        const normalizedEdge = { x: edgeVector.x / edgeLength, y: edgeVector.y / edgeLength }
        const perpVector = { x: -normalizedEdge.y, y: normalizedEdge.x }
        
        // Calculate perpendicular distance moved
        const dragVector = { x: pos.x - dragStartPos.x, y: pos.y - dragStartPos.y }
        const perpDistance = dragVector.x * perpVector.x + dragVector.y * perpVector.y
        
        // Move both corners perpendicular to edge
        corners.value[dragEdgeIndex] = {
          x: origP1.x + perpVector.x * perpDistance,
          y: origP1.y + perpVector.y * perpDistance
        }
        corners.value[nextIndex] = {
          x: origP2.x + perpVector.x * perpDistance,
          y: origP2.y + perpVector.y * perpDistance
        }
        
        drawImage()
      }
    }
  } else {
    // Update cursor based on what's under mouse
    const nearestCorner = findNearestCorner(pos)
    const nearestEdge = findNearestEdge(pos)
    
    if (nearestCorner !== -1) {
      canvas.value.style.cursor = 'grab'
    } else if (nearestEdge !== -1) {
      // Set cursor based on edge orientation
      const nextIndex = (nearestEdge + 1) % 4
      const p1 = corners.value[nearestEdge]
      const p2 = corners.value[nextIndex]
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI
      
      if (Math.abs(angle) < 45 || Math.abs(angle) > 135) {
        canvas.value.style.cursor = 'ns-resize'
      } else {
        canvas.value.style.cursor = 'ew-resize'
      }
    } else {
      canvas.value.style.cursor = 'default'
    }
  }
}

const handleMouseUp = () => {
  isDragging = false
  dragIndex = -1
  dragEdgeIndex = -1
  dragType = 'corner'
  window.lastProjection = 0
  showMagnifier.value = false
}

const handleTouchStart = (e) => {
  e.preventDefault()
  handleMouseDown(e)
}

const handleTouchMove = (e) => {
  e.preventDefault()
  handleMouseMove(e)
}

const handleTouchEnd = (e) => {
  e.preventDefault()
  handleMouseUp()
}

// Reset corners
const resetCorners = () => {
  const margin = 50
  const cnv = canvas.value
  corners.value = [
    { x: margin, y: margin },
    { x: cnv.width - margin, y: margin },
    { x: cnv.width - margin, y: cnv.height - margin },
    { x: margin, y: cnv.height - margin }
  ]
  documentDetected.value = false
  drawImage()
}

const cancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.document-scanner {
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
}

.scanner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  max-width: 100%;
  max-height: 100%;
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  color: white;
  gap: 1rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-bar {
  width: 200px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #00ff00;
  transition: width 0.3s ease;
}

.scan-canvas {
  border: 2px solid #333;
  max-width: 100%;
  max-height: 60vh;
  touch-action: none;
}

.scan-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.control-group {
  display: flex;
  gap: 0.5rem;
}

.scan-info {
  color: white;
  text-align: center;
  font-size: 0.9rem;
}

.scan-info .success {
  color: #00ff00;
}

.btn {
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
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

.btn-success:hover:not(:disabled) {
  background: #218838;
}

/* Magnifier */
.magnifier {
  position: fixed;
  border: 3px solid #0066CC;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  z-index: 1000;
}

.magnifier canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.magnifier-crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 2px;
  background: red;
  pointer-events: none;
}

.magnifier-crosshair::before,
.magnifier-crosshair::after {
  content: '';
  position: absolute;
  background: red;
}

.magnifier-crosshair::before {
  width: 20px;
  height: 2px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.magnifier-crosshair::after {
  width: 2px;
  height: 20px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

@media (max-width: 768px) {
  .control-group {
    flex-wrap: wrap;
  }
  
  .btn {
    padding: 0.5rem 0.8rem;
    font-size: 0.85rem;
  }
}
</style>