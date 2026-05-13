// Encrypted backup/restore of PRIVATE loans using AES-GCM with passphrase-derived key (PBKDF2).
// Uses Web Crypto API (available in React Native via expo-crypto polyfill or directly on web).
import { Platform } from 'react-native';
import { PrivateLoan, getPrivateLoans, savePrivateLoans } from './privateStorage';

// Lazy import to avoid crash on platforms missing crypto
function getSubtle(): SubtleCrypto | null {
  try {
    // @ts-ignore - global crypto exists in modern RN and web
    const c = globalThis.crypto || (Platform.OS === 'web' ? window.crypto : null);
    return c?.subtle ?? null;
  } catch {
    return null;
  }
}

function getRandomValues(arr: Uint8Array): Uint8Array {
  // @ts-ignore
  const c = globalThis.crypto || (Platform.OS === 'web' ? window.crypto : null);
  if (c?.getRandomValues) {
    c.getRandomValues(arr);
    return arr;
  }
  // Fallback (NOT cryptographically strong) — should not happen on real devices
  for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  return arr;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  // @ts-ignore - btoa exists on web; for RN we use Buffer if available
  if (typeof btoa !== 'undefined') return btoa(binary);
  // @ts-ignore
  return Buffer.from(bytes).toString('base64');
}

function base64ToBytes(b64: string): Uint8Array {
  // @ts-ignore
  if (typeof atob !== 'undefined') {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  // @ts-ignore
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtle();
  if (!subtle) throw new Error('Crypto unavailable on this platform');
  const baseKey = await subtle.importKey('raw', encoder.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Export all private loans for the given user as a passphrase-encrypted base64 blob.
 * Format: lendsplit-v1:<base64(salt)>:<base64(iv)>:<base64(ciphertext)>
 */
export async function exportEncryptedBackup(userId: string, passphrase: string): Promise<string> {
  if (passphrase.length < 6) throw new Error('Passphrase must be at least 6 characters');
  const subtle = getSubtle();
  if (!subtle) throw new Error('Crypto not available — try the iOS/Android app');
  const loans = await getPrivateLoans(userId);
  const plaintext = encoder.encode(JSON.stringify({ version: 1, exported_at: new Date().toISOString(), loans }));
  const salt = getRandomValues(new Uint8Array(16));
  const iv = getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));
  return `lendsplit-v1:${bytesToBase64(salt)}:${bytesToBase64(iv)}:${bytesToBase64(ciphertext)}`;
}

/**
 * Restore private loans from an encrypted backup blob. Replaces existing private loans for the user.
 */
export async function importEncryptedBackup(userId: string, blob: string, passphrase: string): Promise<number> {
  const parts = blob.trim().split(':');
  if (parts.length !== 4 || parts[0] !== 'lendsplit-v1') {
    throw new Error('Invalid backup format');
  }
  const subtle = getSubtle();
  if (!subtle) throw new Error('Crypto not available — try the iOS/Android app');
  const salt = base64ToBytes(parts[1]);
  const iv = base64ToBytes(parts[2]);
  const ct = base64ToBytes(parts[3]);
  const key = await deriveKey(passphrase, salt);
  let plain: ArrayBuffer;
  try {
    plain = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  } catch {
    throw new Error('Wrong passphrase or corrupted backup');
  }
  const data = JSON.parse(decoder.decode(plain));
  if (!Array.isArray(data?.loans)) throw new Error('Invalid backup payload');
  const loans = data.loans as PrivateLoan[];
  await savePrivateLoans(userId, loans);
  return loans.length;
}
