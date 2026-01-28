import { Injectable, signal, computed } from '@angular/core';
import { environment } from '../../environments/environment';
import { SensorReading, WebSocketMessage } from '../models/sensor.models';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private subscribedSensorId: number | null = null;

  // Signals for reactive state
  private readonly _connectionStatus = signal<ConnectionStatus>('disconnected');
  private readonly _lastReading = signal<SensorReading | null>(null);
  private readonly _error = signal<string | null>(null);

  // Public computed signals
  readonly connectionStatus = computed(() => this._connectionStatus());
  readonly lastReading = computed(() => this._lastReading());
  readonly error = computed(() => this._error());
  readonly isConnected = computed(() => this._connectionStatus() === 'connected');

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this._connectionStatus.set('connecting');
    this._error.set(null);

    try {
      this.ws = new WebSocket(environment.wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this._connectionStatus.set('connected');
        this.reconnectAttempts = 0;

        // Re-subscribe if we had a subscription
        if (this.subscribedSensorId !== null) {
          this.subscribe(this.subscribedSensorId);
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data as string) as WebSocketMessage;
          this.handleMessage(message);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onerror = () => {
        console.error('WebSocket error');
        this._connectionStatus.set('error');
        this._error.set('WebSocket connection error');
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this._connectionStatus.set('disconnected');
        this.attemptReconnect();
      };
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      this._connectionStatus.set('error');
      this._error.set('Failed to connect to server');
    }
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._connectionStatus.set('disconnected');
  }

  subscribe(sensorId: number): void {
    this.subscribedSensorId = sensorId;
    this.send({ type: 'subscribe', sensorId });
  }

  unsubscribe(): void {
    this.subscribedSensorId = null;
    this.send({ type: 'unsubscribe' });
  }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'reading':
        if (message.data) {
          this._lastReading.set(message.data);
        }
        break;
      case 'connected':
        console.log('Server:', message.message);
        break;
      case 'subscribed':
        console.log(`Subscribed to sensor ${message.sensorId}`);
        break;
      case 'unsubscribed':
        console.log(`Unsubscribed from sensor ${message.sensorId}`);
        break;
      case 'error':
        console.error('Server error:', message.message);
        this._error.set(message.message ?? 'Unknown server error');
        break;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this._error.set('Connection lost. Please refresh the page.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }
}
