import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import admin from 'firebase-admin';
import router from './routes.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Firebase Admin SDK using Application Default Credentials (works on Cloud Run automatically)
const PROJECT_ID = 'clarity-health-a9113e';
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: PROJECT_ID,
    });
  }
  console.log(`Firebase Admin initialized for project: ${PROJECT_ID}`);
} catch (error) {
  console.error('Firebase Admin failed to initialize:', error);
}

// CORS — allow configured origin or all in dev
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? '*';
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Healthcheck API (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'production' });
});

// API Routes
app.use('/api', router);

// Start server
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`Clarity Health Backend running on port ${PORT}`);
  console.log(`CORS origin: ${allowedOrigin}`);
  console.log(`========================================`);
});
