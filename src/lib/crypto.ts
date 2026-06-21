import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Derive the 32-byte encryption key from the environment variable.
 * Accepts a 64-char hex string (256 bits).
 */
function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
  }
  if (hex.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string (256 bits)');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a base64-encoded string: iv + authTag + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack iv (12) + authTag (16) + ciphertext into a single buffer
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString('base64');
}

/**
 * Decrypt a base64-encoded AES-256-GCM ciphertext.
 * Expects the format produced by `encrypt()`.
 */
export function decrypt(encoded: string): string {
  const key = getKey();
  const packed = Buffer.from(encoded, 'base64');

  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted data: too short');
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Derive a stable, collision-resistant, non-reversible key fragment from a
 * secret (e.g. an access token). Used to namespace per-user cache entries
 * without storing the token itself. SHA-256 truncated to 16 hex chars (64 bits)
 * — vastly stronger than the previous 32-bit string hash, which risked
 * cross-tenant cache collisions.
 */
export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 16);
}
