import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { sensorDataService } from '../services/sensor-data.service';
import { SensorReading } from '../types/sensor.types';

interface ClientSubscription {
  ws: WebSocket;
  subscribedSensorId: number | null;
}

export class WebSocketHandler {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ClientSubscription> = new Map();

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('WebSocket client connected');

      this.clients.set(ws, { ws, subscribedSensorId: null });

      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data.toString());
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      this.send(ws, {
        type: 'connected',
        message: 'Connected to temperature monitor WebSocket',
      });
    });

    // Subscribe to sensor readings
    sensorDataService.on('reading', (reading: SensorReading) => {
      this.broadcastReading(reading);
    });

    console.log('WebSocket server initialized on /ws');
  }

  private handleMessage(ws: WebSocket, message: string): void {
    try {
      const data = JSON.parse(message) as { type: string; sensorId?: number };

      switch (data.type) {
        case 'subscribe':
          if (typeof data.sensorId === 'number') {
            const client = this.clients.get(ws);
            if (client) {
              client.subscribedSensorId = data.sensorId;
              this.send(ws, {
                type: 'subscribed',
                sensorId: data.sensorId,
              });
              console.log(`Client subscribed to sensor ${data.sensorId}`);
            }
          }
          break;

        case 'unsubscribe':
          {
            const client = this.clients.get(ws);
            if (client) {
              const previousId = client.subscribedSensorId;
              client.subscribedSensorId = null;
              this.send(ws, {
                type: 'unsubscribed',
                sensorId: previousId,
              });
              console.log(`Client unsubscribed from sensor ${previousId}`);
            }
          }
          break;

        default:
          this.send(ws, {
            type: 'error',
            message: `Unknown message type: ${data.type}`,
          });
      }
    } catch {
      this.send(ws, {
        type: 'error',
        message: 'Invalid JSON message',
      });
    }
  }

  private broadcastReading(reading: SensorReading): void {
    for (const [ws, client] of this.clients.entries()) {
      if (ws.readyState !== WebSocket.OPEN) {
        continue;
      }

      // Send to clients subscribed to this specific sensor or to all readings
      if (
        client.subscribedSensorId === null ||
        client.subscribedSensorId === reading.sensorId
      ) {
        this.send(ws, {
          type: 'reading',
          data: reading,
        });
      }
    }
  }

  private send(ws: WebSocket, data: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  close(): void {
    if (this.wss) {
      this.wss.close();
    }
  }
}

export const webSocketHandler = new WebSocketHandler();
