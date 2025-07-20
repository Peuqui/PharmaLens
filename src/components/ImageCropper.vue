<template>
  <div class="image-cropper">
    <div class="cropper-container">
      <canvas 
        ref="canvas"
        @mousedown="startCrop"
        @mousemove="moveCrop"
        @mouseup="endCrop"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        class="crop-canvas"
      ></canvas>
      
      <div class="crop-controls">
        <button @click="resetCrop" class="btn btn-secondary">
          ↺ Zurücksetzen
        </button>
        <button @click="applyCrop" class="btn btn-primary">
          ✓ Zuschneiden
        </button>
      </div>
      
      <div class="crop-info">
        <p>👆 Ziehen Sie einen Rahmen um den Medikamentenplan</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  imageBlob: Blob
})

const emit = defineEmits(['cropped', 'cancel'])

const canvas = ref(null)
let ctx = null
let image = null
let isDrawing = false
let cropArea = {
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0
}

onMounted(() => {
  if (props.imageBlob) {
    loadImage()
  }
})

watch(() => props.imageBlob, (newBlob) => {
  if (newBlob) {
    loadImage()
  }
})

const loadImage = async () => {
  const url = URL.createObjectURL(props.imageBlob)
  image = new Image()
  
  image.onload = () => {
    const cnv = canvas.value
    ctx = cnv.getContext('2d')
    
    // Set canvas size to fit container while maintaining aspect ratio
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
    
    drawImage()
    URL.revokeObjectURL(url)
  }
  
  image.src = url
}

const drawImage = () => {
  if (!ctx || !image) return
  
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  ctx.drawImage(image, 0, 0, canvas.value.width, canvas.value.height)
  
  // Draw crop area if exists
  if (cropArea.startX || cropArea.endX) {
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    
    const x = Math.min(cropArea.startX, cropArea.endX)
    const y = Math.min(cropArea.startY, cropArea.endY)
    const width = Math.abs(cropArea.endX - cropArea.startX)
    const height = Math.abs(cropArea.endY - cropArea.startY)
    
    ctx.strokeRect(x, y, width, height)
    
    // Darken outside area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, canvas.value.width, y)
    ctx.fillRect(0, y, x, height)
    ctx.fillRect(x + width, y, canvas.value.width - x - width, height)
    ctx.fillRect(0, y + height, canvas.value.width, canvas.value.height - y - height)
  }
}

const getCoordinates = (e) => {
  const rect = canvas.value.getBoundingClientRect()
  const x = (e.clientX || e.touches[0].clientX) - rect.left
  const y = (e.clientY || e.touches[0].clientY) - rect.top
  return { x, y }
}

const startCrop = (e) => {
  isDrawing = true
  const { x, y } = getCoordinates(e)
  cropArea.startX = x
  cropArea.startY = y
  cropArea.endX = x
  cropArea.endY = y
}

const moveCrop = (e) => {
  if (!isDrawing) return
  const { x, y } = getCoordinates(e)
  cropArea.endX = x
  cropArea.endY = y
  drawImage()
}

const endCrop = () => {
  isDrawing = false
}

const handleTouchStart = (e) => {
  e.preventDefault()
  startCrop(e)
}

const handleTouchMove = (e) => {
  e.preventDefault()
  moveCrop(e)
}

const handleTouchEnd = (e) => {
  e.preventDefault()
  endCrop()
}

const resetCrop = () => {
  cropArea = {
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
  }
  drawImage()
}

const applyCrop = () => {
  if (!cropArea.startX && !cropArea.endX) {
    // No crop area selected, use full image
    emit('cropped', props.imageBlob)
    return
  }
  
  // Calculate crop dimensions
  const scaleX = image.width / canvas.value.width
  const scaleY = image.height / canvas.value.height
  
  const x = Math.min(cropArea.startX, cropArea.endX) * scaleX
  const y = Math.min(cropArea.startY, cropArea.endY) * scaleY
  const width = Math.abs(cropArea.endX - cropArea.startX) * scaleX
  const height = Math.abs(cropArea.endY - cropArea.startY) * scaleY
  
  // Create cropped canvas
  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = width
  cropCanvas.height = height
  const cropCtx = cropCanvas.getContext('2d')
  
  cropCtx.drawImage(image, x, y, width, height, 0, 0, width, height)
  
  // Convert to blob
  cropCanvas.toBlob((blob) => {
    emit('cropped', blob)
  }, 'image/jpeg', 0.95)
}
</script>

<style scoped>
.image-cropper {
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
}

.cropper-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  max-width: 100%;
  max-height: 100%;
}

.crop-canvas {
  border: 2px solid #333;
  cursor: crosshair;
  max-width: 100%;
  max-height: 60vh;
}

.crop-controls {
  display: flex;
  gap: 1rem;
}

.crop-info {
  color: white;
  text-align: center;
  font-size: 0.9rem;
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

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}
</style>