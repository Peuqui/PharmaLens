<template>
  <div class="transform-preview">
    <div class="preview-container">
      <h3>Entzerrtes Dokument - Vorschau</h3>
      
      <div class="preview-image-container">
        <img :src="imageUrl" alt="Entzerrtes Dokument" class="preview-image" />
      </div>
      
      <div class="preview-info">
        <p>✅ Dokument wurde erfolgreich entzerrt</p>
        <p class="hint">Überprüfen Sie die Qualität bevor Sie fortfahren</p>
      </div>
      
      <div class="preview-actions">
        <button @click="retry" class="btn btn-secondary">
          ↺ Nochmal versuchen
        </button>
        <button @click="confirm" class="btn btn-primary">
          ✓ Sieht gut aus - Weiter zur Texterkennung
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  imageBlob: {
    type: Blob,
    required: true
  }
})

const emit = defineEmits(['confirm', 'retry'])

const imageUrl = ref('')

onMounted(() => {
  // Create object URL for preview
  imageUrl.value = URL.createObjectURL(props.imageBlob)
})

onUnmounted(() => {
  // Clean up object URL
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
})

const confirm = () => {
  emit('confirm')
}

const retry = () => {
  emit('retry')
}
</script>

<style scoped>
.transform-preview {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 1050;
  overflow-y: auto;
  padding: 1rem;
}

.preview-container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.preview-container h3 {
  text-align: center;
  color: #0066CC;
  margin-bottom: 1.5rem;
}

.preview-image-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
  max-height: 60vh;
  overflow: hidden;
  border: 2px solid #e0e0e0;
  border-radius: 4px;
  background: #f5f5f5;
}

.preview-image {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
  display: block;
}

.preview-info {
  text-align: center;
  margin-bottom: 2rem;
}

.preview-info p {
  margin: 0.5rem 0;
}

.preview-info .hint {
  color: #666;
  font-size: 0.9rem;
}

.preview-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

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

.btn-primary {
  background: #0066CC;
  color: white;
}

.btn-primary:hover {
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

/* Responsive */
@media (max-width: 768px) {
  .preview-container {
    padding: 1rem;
  }
  
  .preview-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>