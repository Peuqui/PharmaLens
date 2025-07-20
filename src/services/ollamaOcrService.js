/**
 * Ollama OCR Service
 * Handles communication with the backend API for AI-powered OCR
 */

class OllamaOcrService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || '/api';
    this.wsURL = this.baseURL.replace('http', 'ws').replace('/api', '/ws');
    this.ws = null;
    this.sessionId = null;
    this.progressCallback = null;
  }

  /**
   * Initialize WebSocket connection for progress updates
   */
  initWebSocket(onProgress) {
    this.progressCallback = onProgress;
    
    try {
      this.ws = new WebSocket(this.wsURL);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected for OCR progress');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Only process messages for our session
          if (data.sessionId === this.sessionId && this.progressCallback) {
            this.progressCallback(data);
          }
        } catch (e) {
          console.error('WebSocket message parse error:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.ws = null;
      };
    } catch (error) {
      console.error('WebSocket initialization failed:', error);
    }
  }

  /**
   * Close WebSocket connection
   */
  closeWebSocket() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Process image with Ollama OCR
   * @param {Blob} imageBlob - The image to process
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} - OCR results
   */
  async processImage(imageBlob, onProgress) {
    this.sessionId = Date.now().toString();
    
    // Initialize WebSocket for progress updates
    if (onProgress) {
      this.initWebSocket(onProgress);
    }

    const formData = new FormData();
    formData.append('image', imageBlob, 'medication-plan.jpg');
    formData.append('sessionId', this.sessionId);

    try {
      const response = await fetch(`${this.baseURL}/ocr/process`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OCR-Verarbeitung fehlgeschlagen');
      }

      const result = await response.json();
      
      // Close WebSocket after successful processing
      this.closeWebSocket();
      
      return result.data;
    } catch (error) {
      console.error('OCR processing error:', error);
      this.closeWebSocket();
      throw error;
    }
  }

  /**
   * Generate BMP30 string from medication data
   * @param {Object} medicationData - The medication data
   * @returns {Promise<string>} - BMP30 formatted string
   */
  async generateBMP30(medicationData) {
    try {
      const response = await fetch(`${this.baseURL}/medication/bmp30`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(medicationData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'BMP30-Generierung fehlgeschlagen');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('BMP30 generation error:', error);
      throw error;
    }
  }

  /**
   * Generate BMP 2.7 XML from medication data
   * @param {Object} medicationData - The medication data
   * @returns {Promise<string>} - BMP 2.7 XML
   */
  async generateBMP27XML(medicationData) {
    try {
      const response = await fetch(`${this.baseURL}/medication/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(medicationData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'BMP XML-Generierung fehlgeschlagen');
      }

      return await response.text();
    } catch (error) {
      console.error('BMP XML generation error:', error);
      throw error;
    }
  }

  /**
   * Check backend health status
   * @returns {Promise<Object>} - Health status
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Validate medication data structure
   * @param {Object} data - Data to validate
   * @returns {boolean} - Is valid
   */
  validateMedicationData(data) {
    if (!data || typeof data !== 'object') return false;
    
    // Check required fields
    if (!data.patient || !data.medications || !Array.isArray(data.medications)) {
      return false;
    }

    // Validate each medication
    return data.medications.every(med => 
      med.name && 
      med.dosing && 
      typeof med.dosing === 'object'
    );
  }

  /**
   * Format medication data for display
   * @param {Object} data - Raw medication data
   * @returns {Object} - Formatted data
   */
  formatMedicationData(data) {
    if (!data) return null;

    return {
      patient: {
        name: data.patient?.name || 'Unbekannt',
        birthDate: data.patient?.birthDate || '',
        gender: data.patient?.gender || '',
        address: data.patient?.address || ''
      },
      medications: (data.medications || []).map(med => ({
        ...med,
        dosing: {
          morning: parseFloat(med.dosing?.morning) || 0,
          noon: parseFloat(med.dosing?.noon) || 0,
          evening: parseFloat(med.dosing?.evening) || 0,
          night: parseFloat(med.dosing?.night) || 0
        },
        displayDosing: this.formatDosing(med.dosing)
      })),
      issueDate: data.issueDate || new Date().toLocaleDateString('de-DE'),
      doctor: data.doctor || {}
    };
  }

  /**
   * Format dosing for display
   * @param {Object} dosing - Dosing object
   * @returns {string} - Formatted dosing string
   */
  formatDosing(dosing) {
    if (!dosing) return '0-0-0-0';
    return `${dosing.morning || 0}-${dosing.noon || 0}-${dosing.evening || 0}-${dosing.night || 0}`;
  }
}

// Export singleton instance
export default new OllamaOcrService();