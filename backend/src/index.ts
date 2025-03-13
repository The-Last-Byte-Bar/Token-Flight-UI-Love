import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import http from 'http';
import apiRoutes from './api/routes';
import { websocketService } from './services/websocket/websocket-service';

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Token Flight API',
      version: '1.0.0',
      description: 'API for the Token Flight platform',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/api/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Initialize express
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api', apiRoutes);

// Create HTTP server to attach WebSocket server
const server = http.createServer(app);

// Initialize WebSocket server
websocketService.initialize(server);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
  console.log(`WebSocket server available at ws://localhost:${port}/ws`);
}); 