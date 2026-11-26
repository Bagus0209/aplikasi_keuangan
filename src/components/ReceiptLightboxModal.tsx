import React, { useEffect } from 'react';
import { IconClose } from './Icons';

interface ReceiptLightboxModalProps {
  imageUrl: string | null;
  caption?: string;
  onClose: () => void;
}

export function ReceiptLightboxModal({
  imageUrl,
  caption,
  onClose
}: ReceiptLightboxModalProps): React.ReactElement | null {
  useEffect(() => {
    if (!imageUrl) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau bukti struk"
    >
      <div className="w-full max-w-[410px] rounded-2xl bg-white p-4 shadow-2xl border border-[#DCE2EC]">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#DCE2EC]">
          <p className="text-sm font-bold text-[#0B1220] truncate">
            {caption || 'Bukti Foto Struk'}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup foto struk"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#DCE2EC] text-[#0B1220] hover:bg-[#F3F5F8]"
          >
            <IconClose />
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl bg-[#F8FAFC] border border-[#DCE2EC] flex items-center justify-center">
          <img
            src={imageUrl}
            alt={caption ? `Bukti struk untuk ${caption}` : 'Bukti foto struk transaksi'}
            width={640}
            height={800}
            className="max-h-[65dvh] w-auto object-contain"
          />
        </div>

        {imageUrl.startsWith('https://') && (
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#0F4C81] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#09355C]"
          >
            Buka Gambar Asli di Google Drive
          </a>
        )}
      </div>
    </div>
  );
}
