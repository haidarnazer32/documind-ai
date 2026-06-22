import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto';

// Generate a 32-byte key from environment variable or use a default for development
function getEncryptionKey(): Buffer {
  // Accept either API_KEY_ENCRYPTION_KEY (canonical) or ENCRYPTION_KEY (legacy alias)
  const keyMaterial =
    process.env.API_KEY_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_KEY ||
    'default-secret-key-for-development-only-change-in-production';
  return createHash('sha256').update(keyMaterial).digest();
}

const KEY = getEncryptionKey();

export function encrypt(text: string): string {
  const iv = randomBytes(12); // GCM recommended IV length
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  // Return IV + encrypted content + authTag as hex
  return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
}

export function decrypt(encryptedText: string): string {
  try {
    const [ivHex, encryptedHex, authTagHex] = encryptedText.split(':');
    if (!ivHex || !encryptedHex || !authTagHex) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt text');
  }
}
