import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import sensorRoutes from './routes/sensor.routes';
import { webSocketHandler } from './websocket/socket-handler';
import { sensorDataService } from './services/sensor-data.service';
import { mockTempProcess } from './mock/mock-temp-process';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const MOCK_MODE = process.env.MOCK_MODE !== 'false'; // Default to mock mode

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', sensorRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket
webSocketHandler.initialize(server);

// Start sensor data service
sensorDataService.start(MOCK_MODE);

// Start mock process if in mock mode
if (MOCK_MODE) {
  mockTempProcess.start();
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  mockTempProcess.stop();
  sensorDataService.stop();
  webSocketHandler.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  mockTempProcess.stop();
  sensorDataService.stop();
  webSocketHandler.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Temperature Monitor Backend running on port ${PORT}`);
  console.log(`Mock mode: ${MOCK_MODE ? 'enabled' : 'disabled'}`);
  console.log(`API: http://localhost:${PORT}/api`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
});
