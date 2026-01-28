import { parseMessage, parseBuffer } from './binary-parser';

describe('Binary Parser', () => {
  describe('parseMessage', () => {
    it('should parse a valid type 2 message correctly', () => {
      // Example from spec: A1 10 = type 2, sensor 33, temp 16
      const buffer = Buffer.from([0xa1, 0x10]);
      const result = parseMessage(buffer);

      expect(result).not.toBeNull();
      expect(result!.sensorId).toBe(33);
      expect(result!.temperature).toBe(16);
      expect(result!.timestamp).toBeDefined();
    });

    it('should return null for type 1 messages', () => {
      // Example from spec: 73 0F = type 1 (01), should be ignored
      const buffer = Buffer.from([0x73, 0x0f]);
      const result = parseMessage(buffer);

      expect(result).toBeNull();
    });

    it('should return null for type 0 messages', () => {
      // Type 0 = 00 in upper 2 bits
      const buffer = Buffer.from([0x00, 0x20]);
      const result = parseMessage(buffer);

      expect(result).toBeNull();
    });

    it('should return null for type 3 messages', () => {
      // Type 3 = 11 in upper 2 bits
      const buffer = Buffer.from([0xc0, 0x30]); // 11 000000, temp 48
      const result = parseMessage(buffer);

      expect(result).toBeNull();
    });

    it('should parse sensor ID 0 correctly', () => {
      // Type 2 (10) + sensor 0 (000000) = 10000000 = 0x80
      const buffer = Buffer.from([0x80, 0x19]); // sensor 0, temp 25
      const result = parseMessage(buffer);

      expect(result).not.toBeNull();
      expect(result!.sensorId).toBe(0);
      expect(result!.temperature).toBe(25);
    });

    it('should parse sensor ID 63 correctly', () => {
      // Type 2 (10) + sensor 63 (111111) = 10111111 = 0xBF
      const buffer = Buffer.from([0xbf, 0xff]); // sensor 63, temp 255
      const result = parseMessage(buffer);

      expect(result).not.toBeNull();
      expect(result!.sensorId).toBe(63);
      expect(result!.temperature).toBe(255);
    });

    it('should return null for buffer too short', () => {
      const buffer = Buffer.from([0xa1]);
      const result = parseMessage(buffer);

      expect(result).toBeNull();
    });

    it('should return null for empty buffer', () => {
      const buffer = Buffer.from([]);
      const result = parseMessage(buffer);

      expect(result).toBeNull();
    });

    it('should parse from offset correctly', () => {
      const buffer = Buffer.from([0x00, 0x00, 0xa1, 0x10]);
      const result = parseMessage(buffer, 2);

      expect(result).not.toBeNull();
      expect(result!.sensorId).toBe(33);
      expect(result!.temperature).toBe(16);
    });
  });

  describe('parseBuffer', () => {
    it('should parse multiple messages', () => {
      // Two type 2 messages
      const buffer = Buffer.from([
        0x80, 0x14, // sensor 0, temp 20
        0x81, 0x19, // sensor 1, temp 25
      ]);
      const results = parseBuffer(buffer);

      expect(results).toHaveLength(2);
      expect(results[0].sensorId).toBe(0);
      expect(results[0].temperature).toBe(20);
      expect(results[1].sensorId).toBe(1);
      expect(results[1].temperature).toBe(25);
    });

    it('should filter out non-type-2 messages', () => {
      const buffer = Buffer.from([
        0x80, 0x14, // type 2, sensor 0, temp 20 (valid)
        0x41, 0x19, // type 1, should be ignored
        0x82, 0x1e, // type 2, sensor 2, temp 30 (valid)
      ]);
      const results = parseBuffer(buffer);

      expect(results).toHaveLength(2);
      expect(results[0].sensorId).toBe(0);
      expect(results[1].sensorId).toBe(2);
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.from([]);
      const results = parseBuffer(buffer);

      expect(results).toHaveLength(0);
    });

    it('should handle odd-length buffer (ignore last byte)', () => {
      const buffer = Buffer.from([0x80, 0x14, 0xff]);
      const results = parseBuffer(buffer);

      expect(results).toHaveLength(1);
      expect(results[0].sensorId).toBe(0);
    });
  });
});
