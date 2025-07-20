<template>
  <div class="image-editor">
    <div class="editor-container">
      <canvas 
        ref="canvas"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        class="edit-canvas"
      ></canvas>
      
      <div class="edit-controls">
        <div class="control-group">
          <button @click="autoDetectDocument" class="btn btn-secondary">
            🔍 Auto-Erkennung
          </button>
          <button @click="rotateLeft" class="btn btn-secondary">
            ↶ Links
          </button>
          <button @click="rotateRight" class="btn btn-secondary">
            ↷ Rechts
          </button>
          <button @click="resetAll" class="btn btn-secondary">
            ↺ Reset
          </button>
          <button @click="makeRectangle" class="btn btn-secondary" title="Rechteck erzwingen">
            ⬜ Rechteck
          </button>
        </div>
        
        <div class="control-group">
          <button @click="cancel" class="btn btn-secondary">
            ✗ Abbrechen
          </button>
          <button @click="applyEdits" class="btn btn-primary">
            ✓ Anwenden
          </button>
        </div>
      </div>
      
      <div class="edit-info">
        <p>🔲 Ecken & Kanten ziehen | 🔄 Drehen mit Buttons</p>
        <p class="info-note">Hinweis: Nimmt rechteckigen Bereich ohne Perspektivkorrektur</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  imageBlob: Blob
})

const emit = defineEmits(['edited', 'cancel'])

const canvas = ref(null)
let ctx = null
let image = null
let rotation = 0
let isDragging = false
let dragHandle = null

// Crop frame with handles
let cropFrame = {
  tl: { x: 100, y: 100 }, // top-left
  tr: { x: 400, y: 100 }, // top-right
  br: { x: 400, y: 300 }, // bottom-right
  bl: { x: 100, y: 300 }  // bottom-left
}

const HANDLE_SIZE = 20

onMounted(() => {
  if (props.imageBlob) {
    loadImage()
  }
})

const loadImage = async () => {
  const url = URL.createObjectURL(props.imageBlob)
  image = new Image()
  
  image.onload = () => {
    const cnv = canvas.value
    ctx = cnv.getContext('2d')
    
    // Set canvas size
    const maxWidth = window.innerWidth * 0.9
    const maxHeight = window.innerHeight * 0.6
    
    let width = image.width
    let height = image.height
    
    if (width > maxWidth) {
      height = (maxWidth / width) * height
      width = maxWidth
    }
    
    if (height > maxHeight) {
      width = (maxHeight / height) * width
      height = maxHeight
    }
    
    cnv.width = width
    cnv.height = height
    
    // Initialize crop frame to center
    const margin = 50
    cropFrame = {
      tl: { x: margin, y: margin },
      tr: { x: width - margin, y: margin },
      br: { x: width - margin, y: height - margin },
      bl: { x: margin, y: height - margin }
    }
    
    drawImage()
    URL.revokeObjectURL(url)
  }
  
  image.src = url
}

const drawImage = () => {
  if (!ctx || !image) return
  
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  
  // Save context state
  ctx.save()
  
  // Apply rotation
  ctx.translate(canvas.value.width / 2, canvas.value.height / 2)
  ctx.rotate(rotation * Math.PI / 180)
  ctx.translate(-canvas.value.width / 2, -canvas.value.height / 2)
  
  // Draw image
  ctx.drawImage(image, 0, 0, canvas.value.width, canvas.value.height)
  
  // Restore context
  ctx.restore()
  
  // Draw crop frame
  drawCropFrame()
}

const drawCropFrame = () => {
  // Darken outside area
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height)
  
  // Clear inside crop area
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cropFrame.tl.x, cropFrame.tl.y)
  ctx.lineTo(cropFrame.tr.x, cropFrame.tr.y)
  ctx.lineTo(cropFrame.br.x, cropFrame.br.y)
  ctx.lineTo(cropFrame.bl.x, cropFrame.bl.y)
  ctx.closePath()
  ctx.clip()
  
  // Redraw image in clipped area
  ctx.save()
  ctx.translate(canvas.value.width / 2, canvas.value.height / 2)
  ctx.rotate(rotation * Math.PI / 180)
  ctx.translate(-canvas.value.width / 2, -canvas.value.height / 2)
  ctx.drawImage(image, 0, 0, canvas.value.width, canvas.value.height)
  ctx.restore()
  ctx.restore()
  
  // Draw frame border
  ctx.strokeStyle = '#00ff00'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(cropFrame.tl.x, cropFrame.tl.y)
  ctx.lineTo(cropFrame.tr.x, cropFrame.tr.y)
  ctx.lineTo(cropFrame.br.x, cropFrame.br.y)
  ctx.lineTo(cropFrame.bl.x, cropFrame.bl.y)
  ctx.closePath()
  ctx.stroke()
  
  // Draw handles
  ctx.setLineDash([])
  ctx.fillStyle = '#00ff00'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 2
  
  // Corner handles
  drawHandle(cropFrame.tl)
  drawHandle(cropFrame.tr)
  drawHandle(cropFrame.br)
  drawHandle(cropFrame.bl)
}

const drawHandle = (point) => {
  ctx.beginPath()
  ctx.arc(point.x, point.y, HANDLE_SIZE / 2, 0, 2 * Math.PI)
  ctx.fill()
  ctx.stroke()
}

const getHandleAt = (x, y) => {
  // Check corners first
  const corners = ['tl', 'tr', 'br', 'bl']
  for (const corner of corners) {
    const point = cropFrame[corner]
    const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2))
    if (dist <= HANDLE_SIZE) {
      return { type: 'corner', id: corner }
    }
  }
  
  // Check edges
  const threshold = 15
  
  // Top edge
  if (Math.abs(y - cropFrame.tl.y) < threshold && 
      x > cropFrame.tl.x && x < cropFrame.tr.x) {
    return { type: 'edge', id: 'top' }
  }
  
  // Right edge
  if (Math.abs(x - cropFrame.tr.x) < threshold && 
      y > cropFrame.tr.y && y < cropFrame.br.y) {
    return { type: 'edge', id: 'right' }
  }
  
  // Bottom edge
  if (Math.abs(y - cropFrame.br.y) < threshold && 
      x > cropFrame.bl.x && x < cropFrame.br.x) {
    return { type: 'edge', id: 'bottom' }
  }
  
  // Left edge
  if (Math.abs(x - cropFrame.bl.x) < threshold && 
      y > cropFrame.tl.y && y < cropFrame.bl.y) {
    return { type: 'edge', id: 'left' }
  }
  
  return null
}

const getCoordinates = (e) => {
  const rect = canvas.value.getBoundingClientRect()
  const x = (e.clientX || e.touches[0].clientX) - rect.left
  const y = (e.clientY || e.touches[0].clientY) - rect.top
  return { x, y }
}

const handleMouseDown = (e) => {
  const { x, y } = getCoordinates(e)
  dragHandle = getHandleAt(x, y)
  if (dragHandle) {
    isDragging = true
  }
}

const handleMouseMove = (e) => {
  const { x, y } = getCoordinates(e)
  
  // Change cursor on hover
  const handle = getHandleAt(x, y)
  if (handle) {
    if (handle.type === 'corner') {
      canvas.value.style.cursor = 'grab'
    } else {
      // Edge cursors
      if (handle.id === 'top' || handle.id === 'bottom') {
        canvas.value.style.cursor = 'ns-resize'
      } else {
        canvas.value.style.cursor = 'ew-resize'
      }
    }
  } else {
    canvas.value.style.cursor = 'default'
  }
  
  if (isDragging && dragHandle) {
    if (dragHandle.type === 'corner') {
      // Move single corner
      cropFrame[dragHandle.id] = { x, y }
    } else if (dragHandle.type === 'edge') {
      // Move entire edge (keeping rectangle shape)
      switch (dragHandle.id) {
        case 'top':
          cropFrame.tl.y = y
          cropFrame.tr.y = y
          break
        case 'right':
          cropFrame.tr.x = x
          cropFrame.br.x = x
          break
        case 'bottom':
          cropFrame.bl.y = y
          cropFrame.br.y = y
          break
        case 'left':
          cropFrame.tl.x = x
          cropFrame.bl.x = x
          break
      }
    }
    drawImage()
  }
}

const handleMouseUp = () => {
  isDragging = false
  dragHandle = null
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

const rotateLeft = () => {
  rotation -= 90
  drawImage()
}

const rotateRight = () => {
  rotation += 90
  drawImage()
}

const resetAll = () => {
  rotation = 0
  const margin = 50
  cropFrame = {
    tl: { x: margin, y: margin },
    tr: { x: canvas.value.width - margin, y: margin },
    br: { x: canvas.value.width - margin, y: canvas.value.height - margin },
    bl: { x: margin, y: canvas.value.height - margin }
  }
  drawImage()
}

const makeRectangle = () => {
  // Force frame to be a perfect rectangle
  const avgWidth = ((cropFrame.tr.x - cropFrame.tl.x) + (cropFrame.br.x - cropFrame.bl.x)) / 2
  const avgHeight = ((cropFrame.bl.y - cropFrame.tl.y) + (cropFrame.br.y - cropFrame.tr.y)) / 2
  
  cropFrame = {
    tl: { x: cropFrame.tl.x, y: cropFrame.tl.y },
    tr: { x: cropFrame.tl.x + avgWidth, y: cropFrame.tl.y },
    br: { x: cropFrame.tl.x + avgWidth, y: cropFrame.tl.y + avgHeight },
    bl: { x: cropFrame.tl.x, y: cropFrame.tl.y + avgHeight }
  }
  
  drawImage()
}

const autoDetectDocument = async () => {
  // Simple edge detection for document boundaries
  const imageData = ctx.getImageData(0, 0, canvas.value.width, canvas.value.height)
  const data = imageData.data
  
  // Convert to grayscale and find edges
  let minX = canvas.value.width, minY = canvas.value.height
  let maxX = 0, maxY = 0
  
  for (let y = 0; y < canvas.value.height; y += 5) {
    for (let x = 0; x < canvas.value.width; x += 5) {
      const idx = (y * canvas.value.width + x) * 4
      const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114
      
      // Simple threshold for white paper detection
      if (gray > 200) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }
  
  // Update crop frame
  const padding = 10
  cropFrame = {
    tl: { x: Math.max(0, minX - padding), y: Math.max(0, minY - padding) },
    tr: { x: Math.min(canvas.value.width, maxX + padding), y: Math.max(0, minY - padding) },
    br: { x: Math.min(canvas.value.width, maxX + padding), y: Math.min(canvas.value.height, maxY + padding) },
    bl: { x: Math.max(0, minX - padding), y: Math.min(canvas.value.height, maxY + padding) }
  }
  
  drawImage()
}

const applyEdits = () => {
  // Create output canvas
  const outputCanvas = document.createElement('canvas')
  const outputCtx = outputCanvas.getContext('2d')
  
  // Calculate output dimensions
  const points = [cropFrame.tl, cropFrame.tr, cropFrame.br, cropFrame.bl]
  const minX = Math.min(...points.map(p => p.x))
  const maxX = Math.max(...points.map(p => p.x))
  const minY = Math.min(...points.map(p => p.y))
  const maxY = Math.max(...points.map(p => p.y))
  
  const outputWidth = maxX - minX
  const outputHeight = maxY - minY
  
  // Scale to original image size
  const scaleX = image.width / canvas.value.width
  const scaleY = image.height / canvas.value.height
  
  outputCanvas.width = outputWidth * scaleX
  outputCanvas.height = outputHeight * scaleY
  
  // Apply perspective transform (simplified)
  outputCtx.save()
  
  // Apply rotation to original image
  if (rotation !== 0) {
    outputCtx.translate(outputCanvas.width / 2, outputCanvas.height / 2)
    outputCtx.rotate(rotation * Math.PI / 180)
    outputCtx.translate(-outputCanvas.width / 2, -outputCanvas.height / 2)
  }
  
  // Draw cropped area
  outputCtx.drawImage(
    image,
    minX * scaleX,
    minY * scaleY,
    outputWidth * scaleX,
    outputHeight * scaleY,
    0,
    0,
    outputCanvas.width,
    outputCanvas.height
  )
  
  outputCtx.restore()
  
  // Convert to blob
  outputCanvas.toBlob((blob) => {
    emit('edited', blob)
  }, 'image/jpeg', 0.95)
}

const cancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.image-editor {
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

.editor-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  max-width: 100%;
  max-height: 100%;
}

.edit-canvas {
  border: 2px solid #333;
  max-width: 100%;
  max-height: 60vh;
  touch-action: none;
}

.edit-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.control-group {
  display: flex;
  gap: 0.5rem;
}

.edit-info {
  color: white;
  text-align: center;
  font-size: 0.9rem;
}

.info-note {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-top: 0.3rem;
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