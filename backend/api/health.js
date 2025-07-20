import { Router } from 'express';
import axios from 'axios';

const router = Router();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';

// Health check endpoint
router.get('/', async (req, res) => {
  const logger = req.app.locals.logger;
  
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        backend: 'operational',
        ollama: 'checking...'
      },
      model: process.env.OLLAMA_MODEL || 'qwen2.5-vision:7b'
    };

    // Check Ollama connectivity
    try {
      const ollamaResponse = await axios.get(`${OLLAMA_URL}/api/tags`, {
        timeout: 5000
      });
      
      health.services.ollama = 'operational';
      health.models = ollamaResponse.data.models?.map(m => m.name) || [];
      
      // Check if our required model is available
      const requiredModel = process.env.OLLAMA_MODEL || 'qwen2.5-vision:7b';
      health.modelAvailable = health.models.some(m => m.includes(requiredModel.split(':')[0]));
      
    } catch (ollamaError) {
      logger.error('Ollama health check failed:', ollamaError.message);
      health.services.ollama = 'unavailable';
      health.ollamaError = ollamaError.message;
    }

    const allHealthy = Object.values(health.services).every(s => s === 'operational');
    
    res.status(allHealthy ? 200 : 503).json(health);
    
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Get system info
router.get('/info', (req, res) => {
  res.json({
    service: 'PharmaLens Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    ollama: {
      url: OLLAMA_URL,
      model: process.env.OLLAMA_MODEL || 'qwen2.5-vision:7b'
    }
  });
});

export default router;