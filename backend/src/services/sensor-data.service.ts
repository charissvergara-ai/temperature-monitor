import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { parseBuffer } from './binary-parser';
import {
  SensorReading,
  SensorStats,
  SensorSummary,
  SensorDetail,
} from '../types/sensor.types';

const MAX_READINGS_PER_SENSOR = 100;
const MESSAGE_RATE_WINDOW_MS = 60000; // 1 minute

interface SensorData {
  readings: SensorReading[];
  totalSum: number;
  totalCount: number;
}

export class SensorDataService extends EventEmitter {
  private sensors: Map<number, SensorData> = new Map();
  private messageTimestamps: number[] = [];
  private process: ChildProcess | null = null;
  private buffer: Buffer = Buffer.alloc(0);
  private startTime: number = Date.now();

  constructor() {
    super();
  }

  start(mockMode: boolean = false): void {
    this.startTime = Date.now();

    if (mockMode) {
      console.log('Starting in mock mode - waiting for mock data...');
      return;
    }

    this.process = spawn('measure_temp');

    this.process.stdout?.on('data', (data: Buffer) => {
      this.handleData(data);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      console.error(`measure_temp stderr: ${data.toString()}`);
    });

    this.process.on('error', (err) => {
      console.error('Failed to start measure_temp:', err.message);
      this.emit('error', err);
    });

    this.process.on('close', (code) => {
      console.log(`measure_temp process exited with code ${code}`);
      this.emit('close', code);
    });
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  /**
   * Handle incoming binary data from the temperature process.
   * Public method to allow mock data injection.
   */
  handleData(data: Buffer): void {
    // Append new data to any leftover buffer
    this.buffer = Buffer.concat([this.buffer, data]);

    // Parse complete 2-byte messages
    const readings = parseBuffer(this.buffer);

    // Keep any incomplete bytes for next time
    const processedBytes = Math.floor(this.buffer.length / 2) * 2;
    this.buffer = this.buffer.subarray(processedBytes);

    // Process each reading
    for (const reading of readings) {
      this.addReading(reading);
    }
  }

  private addReading(reading: SensorReading): void {
    const sensorId = reading.sensorId;

    if (!this.sensors.has(sensorId)) {
      this.sensors.set(sensorId, {
        readings: [],
        totalSum: 0,
        totalCount: 0,
      });
    }

    const sensorData = this.sensors.get(sensorId)!;

    // Add to readings array (keep only recent ones)
    sensorData.readings.push(reading);
    if (sensorData.readings.length > MAX_READINGS_PER_SENSOR) {
      sensorData.readings.shift();
    }

    // Update totals for accurate average
    sensorData.totalSum += reading.temperature;
    sensorData.totalCount++;

    // Track message timestamps for rate calculation
    this.messageTimestamps.push(reading.timestamp);
    this.pruneOldTimestamps();

    // Emit event for WebSocket subscribers
    this.emit('reading', reading);
  }

  private pruneOldTimestamps(): void {
    const cutoff = Date.now() - MESSAGE_RATE_WINDOW_MS;
    while (this.messageTimestamps.length > 0 && this.messageTimestamps[0] < cutoff) {
      this.messageTimestamps.shift();
    }
  }

  getStats(): SensorStats {
    this.pruneOldTimestamps();

    const activeSensorCount = this.sensors.size;
    const messagesInLastMinute = this.messageTimestamps.length;

    // Calculate average per minute
    const elapsedMinutes = Math.max(1, (Date.now() - this.startTime) / 60000);
    const averageMessagesPerMinute =
      elapsedMinutes < 1
        ? messagesInLastMinute
        : Math.round((messagesInLastMinute / Math.min(elapsedMinutes, 1)) * 100) / 100;

    return {
      activeSensorCount,
      averageMessagesPerMinute,
    };
  }

  getAllSensors(): SensorSummary[] {
    const summaries: SensorSummary[] = [];

    for (const [sensorId, data] of this.sensors.entries()) {
      const lastReading = data.readings[data.readings.length - 1] ?? null;

      summaries.push({
        sensorId,
        averageTemperature:
          data.totalCount > 0
            ? Math.round((data.totalSum / data.totalCount) * 100) / 100
            : 0,
        readingCount: data.totalCount,
        lastReading: lastReading?.temperature ?? null,
        lastTimestamp: lastReading?.timestamp ?? null,
      });
    }

    return summaries.sort((a, b) => a.sensorId - b.sensorId);
  }

  getSensor(sensorId: number): SensorDetail | null {
    const data = this.sensors.get(sensorId);

    if (!data) {
      return null;
    }

    const lastReading = data.readings[data.readings.length - 1] ?? null;

    return {
      sensorId,
      averageTemperature:
        data.totalCount > 0
          ? Math.round((data.totalSum / data.totalCount) * 100) / 100
          : 0,
      readingCount: data.totalCount,
      lastReading: lastReading?.temperature ?? null,
      lastTimestamp: lastReading?.timestamp ?? null,
      readings: [...data.readings],
    };
  }
}

// Singleton instance
export const sensorDataService = new SensorDataService();
