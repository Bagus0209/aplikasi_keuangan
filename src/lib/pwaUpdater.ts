/**
 * Pengelola pembaruan otomatis PWA di semua perangkat (Android, iPhone, Desktop).
 * - Memeriksa Service Worker baru saat aplikasi dibuka, kembali aktif dari background,
 *   saat koneksi internet pulih, serta berkala setiap 15 menit.
 * - Ketika versi baru selesai diunduh dan mengambil alih (controllerchange),
 *   halaman otomatis dimuat ulang sehingga tampilan langsung berubah ke versi terbaru.
 */

let initialized = false;
let lastCheckAt = 0;

export function initPwaAutoUpdate(): void {
  if (initialized) return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  initialized = true;

  const hadControllerAtBoot = Boolean(navigator.serviceWorker.controller);
  let isReloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadControllerAtBoot || isReloading) return;
    isReloading = true;
    window.location.reload();
  });

  const checkForUpdate = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastCheckAt < 30_000) return;
    lastCheckAt = now;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
      }
    } catch {
      // Abaikan saat perangkat sedang offline
    }
  };

  window.setTimeout(() => {
    void checkForUpdate(true);
  }, 2000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkForUpdate(false);
    }
  });

  window.addEventListener('online', () => {
    void checkForUpdate(false);
  });

  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      void checkForUpdate(false);
    }
  }, 15 * 60_000);
}

export async function checkPwaUpdateNow(): Promise<'updating' | 'latest' | 'unsupported'> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return 'unsupported';
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'unsupported';
    await reg.update();
    if (reg.installing || reg.waiting) {
      return 'updating';
    }
    return 'latest';
  } catch {
    return 'latest';
  }
}
