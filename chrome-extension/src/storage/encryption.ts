/**
 * Private Key Encryption Module
 *
 * Uses Web Crypto API to securely encrypt/decrypt private keys with a user password.
 * Implements PBKDF2 for key derivation and AES-GCM for encryption.
 *
 * Security Features:
 * - PBKDF2 with 100,000 iterations for key derivation
 * - Random salt for each encryption
 * - AES-GCM for authenticated encryption
 * - Random IV for each encryption
 * - Password never stored, only used for key derivation
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // 128 bits
const IV_LENGTH = 12; // 96 bits (recommended for AES-GCM)
const KEY_LENGTH = 256; // AES-256

export interface EncryptedData {
  encrypted: string; // Base64-encoded ciphertext
  salt: string; // Base64-encoded salt
  iv: string; // Base64-encoded initialization vector
}

/**
 * Convert string to ArrayBuffer
 */
function str2ab(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * Convert ArrayBuffer to string
 */
function ab2str(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Convert ArrayBuffer to Base64
 */
function ab2base64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 to ArrayBuffer
 */
function base642ab(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    str2ab(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate random bytes
 */
function generateRandomBytes(length: number): ArrayBuffer {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array.buffer;
}

/**
 * Encrypt a private key with a password
 *
 * @param privateKey - The private key to encrypt (hex string without 0x prefix)
 * @param password - The user's password
 * @returns Encrypted data including ciphertext, salt, and IV
 */
export async function encryptPrivateKey(
  privateKey: string,
  password: string
): Promise<EncryptedData> {
  if (!privateKey || !password) {
    throw new Error('Private key and password are required');
  }

  // Validate private key format (should be 64 hex characters)
  const cleanKey = privateKey.replace(/^0x/, '');
  if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    throw new Error('Invalid private key format');
  }

  // Generate random salt and IV
  const salt = generateRandomBytes(SALT_LENGTH);
  const iv = generateRandomBytes(IV_LENGTH);

  // Derive encryption key from password
  const key = await deriveKey(password, salt);

  // Encrypt the private key
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    str2ab(cleanKey)
  );

  return {
    encrypted: ab2base64(encrypted),
    salt: ab2base64(salt),
    iv: ab2base64(iv),
  };
}

/**
 * Decrypt a private key with a password
 *
 * @param encryptedData - The encrypted data (ciphertext, salt, IV)
 * @param password - The user's password
 * @returns Decrypted private key (hex string without 0x prefix)
 */
export async function decryptPrivateKey(
  encryptedData: EncryptedData,
  password: string
): Promise<string> {
  if (!encryptedData || !password) {
    throw new Error('Encrypted data and password are required');
  }

  try {
    // Convert from Base64
    const encrypted = base642ab(encryptedData.encrypted);
    const salt = base642ab(encryptedData.salt);
    const iv = base642ab(encryptedData.iv);

    // Derive decryption key from password
    const key = await deriveKey(password, salt);

    // Decrypt the private key
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );

    return ab2str(decrypted);
  } catch (error) {
    // Decryption failure usually means wrong password
    throw new Error('Failed to decrypt private key. Wrong password?');
  }
}

/**
 * Validate password strength
 *
 * @param password - The password to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: 'Password must be at least 8 characters long',
    };
  }

  // Check for at least one number and one letter (basic strength)
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);

  if (!hasNumber || !hasLetter) {
    return {
      isValid: false,
      error: 'Password must contain at least one letter and one number',
    };
  }

  return { isValid: true };
}

/**
 * Securely clear sensitive data from memory
 * Note: This is best-effort in JavaScript, not guaranteed
 */
export function clearSensitiveData(data: string | ArrayBuffer): void {
  if (typeof data === 'string') {
    // Overwrite string with zeros (best effort)
    data = '\0'.repeat(data.length);
  } else {
    // Overwrite ArrayBuffer with zeros
    const view = new Uint8Array(data);
    crypto.getRandomValues(view);
    view.fill(0);
  }
}
