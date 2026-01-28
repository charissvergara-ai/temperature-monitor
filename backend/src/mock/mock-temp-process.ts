import { sensorDataService } from '../services/sensor-data.service';

const DEFAULT_SENSOR_COUNT = 10;
const DEFAULT_INTERVAL_MS = 2000;

/**
 * Creates a mock temperature data generator that simulates
 * the measure_temp binary output.
 */
export class MockTempProcess {
  private intervalId: NodeJS.Timeout | null = null;
  private sensorCount: number;
  private intervalMs: number;

  constructor(sensorCount?: number, intervalMs?: number) {
    this.sensorCount = sensorCount ?? DEFAULT_SENSOR_COUNT;
    this.intervalMs = intervalMs ?? DEFAULT_INTERVAL_MS;
  }

  /**
   * Generates a 2-byte message for a type 2 sensor reading.
   *
   * Byte 1: [type (2 bits)][sensorId (6 bits)]
   * Byte 2: [temperature (8 bits)]
   */
  private generateMessage(sensorId: number, temperature: number): Buffer {
    // Type 2 = 0b10, shifted to upper 2 bits
    const messageType = 0b10;
    const byte1 = (messageType << 6) | (sensorId & 0b00111111);
    const byte2 = temperature & 0xff;

    return Buffer.from([byte1, byte2]);
  }

  /**
   * Generates a random temperature reading.
   * Simulates realistic temperatures between 15-35°C with some variation.
   */
  private generateTemperature(sensorId: number): number {
    // Base temperature varies by sensor (simulating different locations)
    const baseTemp = 20 + (sensorId % 10);
    // Add random variation of ±5 degrees
    const variation = Math.floor(Math.random() * 11) - 5;
    return Math.max(0, Math.min(255, baseTemp + variation));
  }

  start(): void {
    console.log(
      `Mock temperature process started: ${this.sensorCount} sensors, ${this.intervalMs}ms interval`
    );

    this.intervalId = setInterval(() => {
      // Pick a random sensor
      const sensorId = Math.floor(Math.random() * this.sensorCount);
      const temperature = this.generateTemperature(sensorId);

      // Generate and send the binary message
      const buffer = this.generateMessage(sensorId, temperature);
      sensorDataService.handleData(buffer);

      // Occasionally generate a non-type-2 message to test filtering
      if (Math.random() < 0.1) {
        // Type 1 message (should be ignored)
        const type1Byte1 = (0b01 << 6) | (sensorId & 0b00111111);
        const type1Buffer = Buffer.from([type1Byte1, temperature]);
        sensorDataService.handleData(type1Buffer);
      }
    }, this.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Mock temperature process stopped');
    }
  }
}

export const mockTempProcess = new MockTempProcess(
  parseInt(process.env.MOCK_SENSOR_COUNT ?? '', 10) || DEFAULT_SENSOR_COUNT,
  parseInt(process.env.MOCK_INTERVAL_MS ?? '', 10) || DEFAULT_INTERVAL_MS
);
