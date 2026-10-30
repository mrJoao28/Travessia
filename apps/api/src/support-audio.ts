import { fail } from './errors.js';

// Quarantine in memory: accept only canonical PCM WAV, no metadata, extensions,
// compressed codecs, embedded objects or external links. Never serve original bytes.
export function verifySupportAudio(base64: string): Uint8Array<ArrayBuffer> {
  const invalid = () => fail(400, 'INVALID_AUDIO', 'Use áudio WAV PCM mono, 16 kHz, 16 bits, até 30 segundos.');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) return invalid();
  const b = Buffer.from(base64, 'base64');
  if (b.length < 46 || b.length > 1048576 || b.toString('base64') !== base64) return invalid();
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.readUInt32LE(4) !== b.length - 8 || b.toString('ascii', 8, 12) !== 'WAVE' ||
      b.toString('ascii', 12, 16) !== 'fmt ' || b.readUInt32LE(16) !== 16 || b.readUInt16LE(20) !== 1 ||
      b.readUInt16LE(22) !== 1 || b.readUInt32LE(24) !== 16000 || b.readUInt32LE(28) !== 32000 ||
      b.readUInt16LE(32) !== 2 || b.readUInt16LE(34) !== 16 || b.toString('ascii', 36, 40) !== 'data' ||
      b.readUInt32LE(40) !== b.length - 44 || (b.length - 44) % 2 || (b.length - 44) > 30 * 32000) return invalid();
  const clean = Buffer.alloc(b.length);
  clean.write('RIFF'); clean.writeUInt32LE(b.length - 8, 4); clean.write('WAVEfmt ', 8); clean.writeUInt32LE(16, 16);
  clean.writeUInt16LE(1, 20); clean.writeUInt16LE(1, 22); clean.writeUInt32LE(16000, 24); clean.writeUInt32LE(32000, 28);
  clean.writeUInt16LE(2, 32); clean.writeUInt16LE(16, 34); clean.write('data', 36); clean.writeUInt32LE(b.length - 44, 40);
  b.copy(clean, 44, 44);
  return clean;
}
