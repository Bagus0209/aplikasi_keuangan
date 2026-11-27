import React, { useEffect, useState } from 'react';
import { IconClose } from './Icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallPwaBanner(): React.ReactElement | null {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowGuideModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showGuideModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGuideModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showGuideModal]);

  if (isStandalone || dismissed) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      return;
    }
    setShowGuideModal(true);
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <>
      <div className="mb-3 rounded-2xl bg-[#0F4C81] p-3.5 text-white flex items-center justify-between gap-2.5 shadow-xs">
        <div className="min-w-0">
          <p className="text-xs font-bold">Pasang KasPresisi ke Layar Utama HP</p>
          <p className="text-[11px] text-[#DBEAFE] mt-0.5">
            {deferredPrompt
              ? 'Ketuk tombol Instal agar aplikasi muncul di menu HP Anda.'
              : 'Buka penuh layar seperti aplikasi native di Android & iPhone.'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => void handleInstallClick()}
            className="min-h-[44px] rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#0B1220] hover:bg-[#F8FAFC]"
          >
            Instal ke HP
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Sembunyikan banner instalasi"
            className="min-h-[44px] min-w-[36px] inline-flex items-center justify-center rounded-xl text-white/80 hover:bg-white/10"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#0B1220]/65 p-0 md:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
        >
          <div className="w-full md:max-w-[430px] rounded-t-2xl md:rounded-2xl bg-white p-5 border border-[#DCE2EC] space-y-3.5">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#DCE2EC]">
              <h2 id="install-guide-title" className="text-base font-bold text-[#0B1220]">
                Cara Memasang ke Layar Utama HP
              </h2>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Tutup panduan instalasi"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#DCE2EC] text-[#0B1220]"
              >
                <IconClose />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-[#0B1220]">
              <div className="rounded-xl bg-[#F8FAFC] border border-[#DCE2EC] p-3 space-y-1.5">
                <p className="font-bold text-[#0F4C81]">1. Pastikan Dibuka di Aplikasi Google Chrome</p>
                <p className="text-[#475569]">
                  Jika Anda membuka link ini dari dalam WhatsApp / Telegram / Mi Browser, salin link di bawah lalu tempelkan langsung di aplikasi <strong>Google Chrome</strong>:
                </p>
                <button
                  type="button"
                  onClick={() => void handleCopyUrl()}
                  className="mt-1 w-full min-h-[44px] rounded-xl bg-[#0B1220] px-3 py-2 text-xs font-bold text-white"
                >
                  {copiedUrl ? 'Link Berhasil Disalin!' : 'Salin Link Aplikasi'}
                </button>
              </div>

              <div className="rounded-xl bg-[#F8FAFC] border border-[#DCE2EC] p-3 space-y-1">
                <p className="font-bold text-[#0F4C81]">2. Di Google Chrome (Xiaomi / Android)</p>
                <p className="text-[#475569]">
                  Ketuk <strong>titik tiga (⋮)</strong> di kanan atas Chrome, lalu pilih menu <strong>Instal aplikasi (Install app)</strong> atau <strong>Tambahkan ke layar utama</strong>.
                </p>
              </div>

              <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-3 space-y-1">
                <p className="font-bold text-[#92400E]">Khusus Pengguna Xiaomi HyperOS / MIUI:</p>
                <p className="text-[#78350F]">
                  Agar ikon langsung muncul di layar depan Xiaomi, aktifkan izin: <strong>Setelan HP &gt; Aplikasi &gt; Kelola aplikasi &gt; Chrome &gt; Izin lainnya &gt; Pintasan layar utama &gt; Selalu izinkan</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
