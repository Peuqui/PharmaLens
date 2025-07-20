import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { WebSocketServer } from 'ws';
import winston from 'winston';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import ocrRouter from './api/ocr.js';
import medicationRouter from './api/medication.js';
import healthRouter from './api/health.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  logger.info('New WebSocket connection established');
  
  ws.on('message', (message) => {
    logger.info(`Received message: ${message}`);
  });

  ws.on('close', () => {
    logger.info('WebSocket connection closed');
  });
});

// Make WebSocket server available to routes
app.locals.wss = wss;
app.locals.logger = logger;
app.locals.upload = upload;

// API routes
app.use('/api/ocr', ocrRouter);
app.use('/api/medication', medicationRouter);
app.use('/api/health', healthRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Interner Serverfehler',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint nicht gefunden',
      status: 404
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`PharmaLens Backend läuft auf Port ${PORT}`);
  logger.info(`Ollama URL: ${process.env.OLLAMA_URL || 'http://ollama:11434'}`);
});