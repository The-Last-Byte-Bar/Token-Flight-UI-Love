import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import apiRoutes from './api/routes';

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv
  });
});

// Start server if not in test environment
if (env.nodeEnv !== 'test') {
  app.listen(env.port, () => {
    console.log(`Server is running on port ${env.port} in ${env.nodeEnv} mode`);
  });
}

export default app; 