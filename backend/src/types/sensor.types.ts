export interface SensorReading {
  sensorId: number;
  temperature: number;
  timestamp: number;
}

export interface SensorStats {
  activeSensorCount: number;
  averageMessagesPerMinute: number;
}

export interface SensorSummary {
  sensorId: number;
  averageTemperature: number;
  readingCount: number;
  lastReading: number | null;
  lastTimestamp: number | null;
}

export interface SensorDetail extends SensorSummary {
  readings: SensorReading[];
}
