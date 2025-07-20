<template>
  <div v-if="showDebug" class="debug-console">
    <div class="debug-header">
      <h4>Debug Console</h4>
      <button @click="$emit('close')" class="close-btn">✕</button>
    </div>
    <div class="debug-content">
      <div v-for="(log, index) in logs" :key="index" class="log-entry" :class="log.type">
        <span class="timestamp">{{ log.time }}</span>
        <span class="message">{{ log.message }}</span>
        <pre v-if="log.data" class="data">{{ JSON.stringify(log.data, null, 2) }}</pre>
      </div>
    </div>
    <button @click="clearLogs" class="btn-clear">Clear</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  showDebug: Boolean
})

const emit = defineEmits(['close'])

const logs = ref([])
const originalConsole = {}

// Override console methods
const interceptConsole = () => {
  ['log', 'error', 'warn', 'info'].forEach(method => {
    originalConsole[method] = console[method]
    console[method] = (...args) => {
      // Call original method
      originalConsole[method](...args)
      
      // Add to our logs
      logs.value.push({
        type: method,
        time: new Date().toLocaleTimeString(),
        message: args[0],
        data: args.length > 1 ? args.slice(1) : null
      })
      
      // Keep only last 50 logs
      if (logs.value.length > 50) {
        logs.value.shift()
      }
    }
  })
}

// Restore console methods
const restoreConsole = () => {
  Object.keys(originalConsole).forEach(method => {
    console[method] = originalConsole[method]
  })
}

const clearLogs = () => {
  logs.value = []
}

onMounted(() => {
  interceptConsole()
})

onUnmounted(() => {
  restoreConsole()
})
</script>

<style scoped>
.debug-console {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 300px;
  background: #1e1e1e;
  color: #fff;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.5);
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #2d2d2d;
  border-bottom: 1px solid #444;
}

.debug-header h4 {
  margin: 0;
  font-size: 14px;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
}

.debug-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.log-entry {
  margin-bottom: 8px;
  padding: 4px;
  border-radius: 3px;
}

.log-entry.error {
  background: rgba(255, 0, 0, 0.1);
  color: #ff6b6b;
}

.log-entry.warn {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.log-entry.info {
  color: #17a2b8;
}

.timestamp {
  color: #666;
  margin-right: 10px;
}

.message {
  word-break: break-all;
}

.data {
  margin-top: 5px;
  padding: 5px;
  background: rgba(0,0,0,0.3);
  border-radius: 3px;
  font-size: 11px;
  overflow-x: auto;
}

.btn-clear {
  padding: 5px 15px;
  background: #444;
  color: #fff;
  border: none;
  cursor: pointer;
}

.btn-clear:hover {
  background: #555;
}

@media (max-width: 768px) {
  .debug-console {
    height: 40vh;
  }
}
</style>