import { SensorReading } from '../types/sensor.types';

const MESSAGE_TYPE_2 = 0b10;

/**
 * Parses a 2-byte buffer containing sensor data.
 *
 * Binary structure:
 * - Bits 0-1: Message type (we only care about type 2, binary: 10)
 * - Bits 2-7: Sensor ID (0-63)
 * - Bits 8-15: Temperature in Celsius (0-255)
 *
 * Example: A1 10 = 1010 0001 0001 0000
 *   - Type: 10 (binary) = 2
 *   - Sensor ID: 100000 (binary) = 32... wait, let me re-read
 *   - Actually byte A1 = 1010 0001
 *     - Bits 0-1: 01 reversed...
 *
 * Note: The bits are numbered from LSB (0) to MSB.
 * Byte A1 (0xA1) = 1010 0001 in binary
 *   - Bit 0 = 1, Bit 1 = 0, so bits 0-1 = 01?
 *
 * Re-reading the spec: "bits 0-1" with value "10" for type 2.
 * The example says A1 10 = type 2, sensor 33, temp 16.
 *
 * 0xA1 = 161 = 1010 0001
 * If bits 0-1 (LSB) are 01, that's type 1, not type 2.
 *
 * But wait, maybe they mean bits are numbered from MSB?
 * Or the bits are: bits 0-1 = the two LEAST significant bits.
 *
 * Let me work backwards from the example:
 * - Sensor ID 33 = 0b100001 (6 bits)
 * - Type 2 = 0b10 (2 bits)
 * - Combined: 10 100001 = 0xA1... but wait
 *   0b10100001 = 161 = 0xA1 ✓
 *
 * So the structure is: [type 2 bits][sensor ID 6 bits] in the first byte
 * Reading from MSB: type (2 bits) | sensor ID (6 bits)
 *
 * Actually re-reading: bits 0-1 are the type.
 * 0xA1 = 1010 0001
 * Bits 0-1 (rightmost) = 01 = type 1?
 *
 * Hmm, but the example clearly states A1 10 is type 2, sensor 33.
 * Let me reconsider: maybe "bits 0-1" means the first two bits (MSB).
 *
 * 0xA1 = 1010 0001
 * First two bits (MSB): 10 = type 2 ✓
 * Next 6 bits: 10 0001 = 33 ✓
 *
 * 0x10 = 0001 0000 = 16 = temperature ✓
 *
 * So the bit numbering is from MSB (bit 0 = MSB).
 */

export function parseMessage(buffer: Buffer, offset: number = 0): SensorReading | null {
  if (buffer.length < offset + 2) {
    return null;
  }

  const byte1 = buffer[offset];
  const byte2 = buffer[offset + 1];

  // Extract message type (bits 0-1, i.e., the two MSB bits of byte1)
  const messageType = (byte1 >> 6) & 0b11;

  // Only process type 2 messages (binary: 10 = decimal 2)
  if (messageType !== MESSAGE_TYPE_2) {
    return null;
  }

  // Extract sensor ID (bits 2-7, i.e., the lower 6 bits of byte1)
  const sensorId = byte1 & 0b00111111;

  // Temperature is the entire second byte (8-bit unsigned integer)
  const temperature = byte2;

  return {
    sensorId,
    temperature,
    timestamp: Date.now(),
  };
}

/**
 * Parses a buffer that may contain multiple 2-byte messages.
 * Returns all valid type-2 readings found.
 */
export function parseBuffer(buffer: Buffer): SensorReading[] {
  const readings: SensorReading[] = [];

  for (let i = 0; i < buffer.length - 1; i += 2) {
    const reading = parseMessage(buffer, i);
    if (reading) {
      readings.push(reading);
    }
  }

  return readings;
}
