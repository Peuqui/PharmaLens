<template>
  <div class="medication-plan">
    <h2>Medikamentenplan</h2>
    
    <!-- Patient Information -->
    <section class="patient-section">
      <h3>Patientendaten</h3>
      <div class="form-group">
        <label>Name:</label>
        <input 
          v-model="localPatientInfo.name" 
          type="text" 
          class="form-input"
          placeholder="Vorname Nachname"
        >
      </div>
      <div class="form-group">
        <label>Geburtsdatum:</label>
        <input 
          v-model="localPatientInfo.birthDate" 
          type="text" 
          class="form-input"
          placeholder="TT.MM.JJJJ"
        >
      </div>
      <div class="form-group">
        <label>Adresse:</label>
        <input 
          v-model="localPatientInfo.address" 
          type="text" 
          class="form-input"
          placeholder="Straße Nr, PLZ Ort"
        >
      </div>
    </section>

    <!-- OCR Text Preview -->
    <section v-if="ocrText" class="ocr-preview">
      <h3>Erkannter Text</h3>
      <pre class="ocr-text">{{ ocrText }}</pre>
      <button @click="showOcrText = !showOcrText" class="btn btn-secondary">
        {{ showOcrText ? 'Verbergen' : 'Anzeigen' }}
      </button>
    </section>

    <!-- Medications Table -->
    <section class="medications-section">
      <h3>Medikamente</h3>
      <div class="table-container">
        <table class="medications-table">
          <thead>
            <tr>
              <th>Wirkstoff</th>
              <th>Handelsname</th>
              <th>Stärke</th>
              <th>Form</th>
              <th>Dosierung</th>
              <th>Hinweise</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(med, index) in localMedications" :key="index">
              <td>
                <input 
                  v-model="med.activeIngredient" 
                  type="text" 
                  class="table-input"
                  placeholder="Wirkstoff"
                >
              </td>
              <td>
                <input 
                  v-model="med.name" 
                  type="text" 
                  class="table-input"
                  placeholder="Handelsname"
                >
              </td>
              <td>
                <input 
                  v-model="med.strength" 
                  type="text" 
                  class="table-input small"
                  placeholder="z.B. 100mg"
                >
              </td>
              <td>
                <select v-model="med.form" class="table-input">
                  <option>Tablette</option>
                  <option>Kapsel</option>
                  <option>Tropfen</option>
                  <option>Salbe</option>
                  <option>Spritze</option>
                  <option>Pulver</option>
                  <option>Zäpfchen</option>
                </select>
              </td>
              <td>
                <input 
                  v-model="med.dosage" 
                  type="text" 
                  class="table-input"
                  placeholder="1-0-1-0"
                >
              </td>
              <td>
                <input 
                  v-model="med.indication" 
                  type="text" 
                  class="table-input"
                  placeholder="Indikation"
                >
              </td>
              <td>
                <button @click="removeMedication(index)" class="btn-remove">
                  ❌
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <button @click="addMedication" class="btn btn-secondary">
        + Medikament hinzufügen
      </button>
    </section>

    <!-- Action Buttons -->
    <div class="actions">
      <button @click="saveChanges" class="btn btn-primary">
        Änderungen speichern
      </button>
      <button @click="generateQR" class="btn btn-success">
        QR-Code generieren
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  patientInfo: {
    type: Object,
    default: () => ({})
  },
  medications: {
    type: Array,
    default: () => ([])
  },
  ocrText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['edit', 'generate-qr'])

// Local copies for editing
const localPatientInfo = ref({ ...props.patientInfo })
const localMedications = ref(props.medications.map(m => ({ ...m })))
const showOcrText = ref(false)

// Watch for prop changes
watch(() => props.patientInfo, (newVal) => {
  localPatientInfo.value = { ...newVal }
}, { deep: true })

watch(() => props.medications, (newVal) => {
  localMedications.value = newVal.map(m => ({ ...m }))
}, { deep: true })

// Add new medication
const addMedication = () => {
  localMedications.value.push({
    activeIngredient: '',
    name: '',
    strength: '',
    form: 'Tablette',
    dosage: '',
    indication: '',
    unit: 'Tbl'
  })
}

// Remove medication
const removeMedication = (index) => {
  localMedications.value.splice(index, 1)
}

// Save changes
const saveChanges = () => {
  emit('edit', {
    patientInfo: { ...localPatientInfo.value },
    medications: localMedications.value.map(m => ({ ...m }))
  })
}

// Generate QR code
const generateQR = () => {
  saveChanges()
  emit('generate-qr')
}
</script>

<style scoped>
.medication-plan {
  max-width: 1000px;
  margin: 0 auto;
}

h2 {
  color: #0066CC;
  margin-bottom: 1.5rem;
}

h3 {
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.patient-section,
.ocr-preview,
.medications-section {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: #555;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: #0066CC;
}

.ocr-preview {
  position: relative;
}

.ocr-text {
  background: white;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 1rem;
}

.medications-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.medications-table th,
.medications-table td {
  padding: 0.5rem;
  border: 1px solid #ddd;
  text-align: left;
}

.medications-table th {
  background: #f1f3f5;
  font-weight: 600;
  color: #333;
}

.table-input {
  width: 100%;
  padding: 0.25rem;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  font-size: 0.875rem;
}

.table-input.small {
  width: 80px;
}

.table-input:focus {
  outline: none;
  border-color: #0066CC;
}

.btn-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.25rem;
}

.btn-remove:hover {
  opacity: 0.7;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
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

/* Mobile optimizations */
@media (max-width: 768px) {
  .medications-table {
    font-size: 0.75rem;
  }
  
  .table-input {
    font-size: 0.75rem;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>