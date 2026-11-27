import type { PinLockConfig } from './types';

const STORAGE_PIN_KEY = 'kaspresisi_pin_lock_v1';

export function createDisabledPinConfig(): PinLockConfig {
  return {
    enabled: false,
    pinHash: '',
    salt: '',
    pinLength: 6,
    autoLockMinutes: 0
  };
}

export function loadPinLockConfig(): PinLockConfig {
  try {
    const raw = localStorage.getItem(STORAGE_PIN_KEY);
    if (!raw) return createDisabledPinConfig();
    const parsed = JSON.parse(raw) as Partial<PinLockConfig>;
    if (!parsed.enabled || !parsed.pinHash || !parsed.salt) {
      return createDisabledPinConfig();
    }
    return {
      enabled: true,
      pinHash: String(parsed.pinHash),
      salt: String(parsed.salt),
      pinLength: parsed.pinLength === 4 ? 4 : 6,
      autoLockMinutes:
        typeof parsed.autoLockMinutes === 'number' && parsed.autoLockMinutes >= 0
          ? parsed.autoLockMinutes
          : 0
    };
  } catch {
    return createDisabledPinConfig();
  }
}

export function savePinLockConfig(config: PinLockConfig): void {
  try {
    localStorage.setItem(STORAGE_PIN_KEY, JSON.stringify(config));
  } catch {
    // Abaikan bila localStorage tidak tersedia
  }
}

export function clearPinLockConfig(): PinLockConfig {
  const empty = createDisabledPinConfig();
  savePinLockConfig(empty);
  return empty;
}

function generateSalt(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Menghasilkan hash SHA-256 dengan salt untuk PIN lokal.
 * Menggunakan fallback deterministik jika crypto.subtle tidak tersedia (misal HTTP LAN).
 */
export async function hashPinWithSalt(pin: string, salt: string): Promise<string> {
  const payload = `kaspresisi::${salt}::${pin}`;
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const encoded = new TextEncoder().encode(payload);
      const digest = await crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback jika subtle dibatasi
    }
  }
  // Fallback FNV-1a 64-bit ganda untuk lingkungan non-HTTPS
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `fb_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export async function createPinLockConfig(
  pin: string,
  pinLength: 4 | 6,
  autoLockMinutes: number
): Promise<PinLockConfig> {
  const cleanPin = pin.replace(/[^\d]/g, '');
  if (cleanPin.length !== pinLength) {
    throw new Error(`PIN harus terdiri dari tepat ${pinLength} angka.`);
  }
  const salt = generateSalt();
  const pinHash = await hashPinWithSalt(cleanPin, salt);
  return {
    enabled: true,
    pinHash,
    salt,
    pinLength,
    autoLockMinutes: Math.max(0, Math.round(autoLockMinutes || 0))
  };
}

export async function verifyLocalPin(pin: string, config: PinLockConfig): Promise<boolean> {
  if (!config.enabled || !config.pinHash || !config.salt) return true;
  const cleanPin = pin.replace(/[^\d]/g, '');
  if (cleanPin.length !== config.pinLength) return false;
  const candidateHash = await hashPinWithSalt(cleanPin, config.salt);
  return candidateHash === config.pinHash;
}
