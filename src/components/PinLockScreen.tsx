import React, { useCallback, useEffect, useState } from 'react';
import { IconLock } from './Icons';
import { verifyLocalPin } from '../lib/pinLock';
import type { PinLockConfig } from '../lib/types';

interface PinLockScreenProps {
  config: PinLockConfig;
  onUnlock: () => void;
  onResetPinAndClearLocal: () => void;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export function PinLockScreen({
  config,
  onUnlock,
  onResetPinAndClearLocal
}: PinLockScreenProps): React.ReactElement {
  const [entered, setEntered] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [showResetFlow, setShowResetFlow] = useState(false);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSec]);

  const tryVerify = useCallback(
    async (candidate: string) => {
      const ok = await verifyLocalPin(candidate, config);
      if (ok) {
        setEntered('');
        setErrorMsg(null);
        setFailedCount(0);
        onUnlock();
        return;
      }

      const nextFails = failedCount + 1;
      setFailedCount(nextFails);
      setEntered('');
      if (nextFails >= MAX_ATTEMPTS) {
        setCooldownSec(LOCKOUT_SECONDS);
        setErrorMsg(
          `Terlalu banyak percobaan salah. Tunggu ${LOCKOUT_SECONDS} detik sebelum mencoba lagi.`
        );
      } else {
        setErrorMsg(`PIN salah. Sisa percobaan: ${MAX_ATTEMPTS - nextFails}.`);
      }
    },
    [config, failedCount, onUnlock]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (cooldownSec > 0) return;
      setErrorMsg(null);
      setEntered((prev) => {
        if (prev.length >= config.pinLength) return prev;
        const next = prev + digit;
        if (next.length === config.pinLength) {
          void tryVerify(next);
        }
        return next;
      });
    },
    [config.pinLength, cooldownSec, tryVerify]
  );

  const handleBackspace = useCallback(() => {
    if (cooldownSec > 0) return;
    setEntered((prev) => prev.slice(0, -1));
  }, [cooldownSec]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showResetFlow) return;
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDigit, handleBackspace, showResetFlow]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FAFAFB] px-5 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-lock-heading"
    >
      <div className="w-full max-w-[360px] flex flex-col items-center text-center space-y-5">
        <div className="flex flex-col items-center gap-2.5">
          <div className="relative">
            <img
              src="./icon-192.png"
              alt="Logo KasPresisi"
              width={56}
              height={56}
              className="h-14 w-14 rounded-2xl border border-[#DCE2EC] object-cover shadow-xs"
            />
            <span className="absolute -right-1.5 -bottom-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0F4C81] text-white border-2 border-[#FAFAFB]">
              <IconLock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <h1 id="pin-lock-heading" className="text-lg font-bold text-[#0B1220]">
              KasPresisi Terkunci
            </h1>
            <p className="text-xs text-[#475569] mt-0.5">
              Masukkan PIN lokal {config.pinLength} angka untuk membuka saldo Anda
            </p>
          </div>
        </div>

        {/* Indikator Titik PIN */}
        <div
          className="flex items-center justify-center gap-3 py-1"
          aria-label={`PIN terisi ${entered.length} dari ${config.pinLength} angka`}
        >
          {Array.from({ length: config.pinLength }).map((_, idx) => {
            const filled = idx < entered.length;
            return (
              <span
                key={idx}
                className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${
                  filled
                    ? 'border-[#0F4C81] bg-[#0F4C81]'
                    : 'border-[#94A3B8] bg-white'
                }`}
              />
            );
          })}
        </div>

        {(errorMsg || cooldownSec > 0) && (
          <p
            role="alert"
            className="w-full rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-xs font-semibold text-[#9F1D2C] tnum"
          >
            {cooldownSec > 0
              ? `Tunggu ${cooldownSec} detik sebelum mencoba PIN lagi.`
              : errorMsg}
          </p>
        )}

        {/* Keypad Numerik */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[276px]">
          {digits.map((d) => (
            <button
              key={d}
              type="button"
              disabled={cooldownSec > 0}
              onClick={() => handleDigit(d)}
              className="min-h-[58px] rounded-2xl border border-[#DCE2EC] bg-white text-xl font-bold text-[#0B1220] shadow-xs hover:bg-[#F1F5F9] active:bg-[#E2E8F0] disabled:opacity-50 tnum"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            disabled={cooldownSec > 0 || entered.length === 0}
            onClick={() => setEntered('')}
            className="min-h-[58px] rounded-2xl border border-[#DCE2EC] bg-[#F8FAFC] text-xs font-bold text-[#475569] hover:bg-[#E2E8F0] disabled:opacity-40"
          >
            Ulangi
          </button>
          <button
            type="button"
            disabled={cooldownSec > 0}
            onClick={() => handleDigit('0')}
            className="min-h-[58px] rounded-2xl border border-[#DCE2EC] bg-white text-xl font-bold text-[#0B1220] shadow-xs hover:bg-[#F1F5F9] active:bg-[#E2E8F0] disabled:opacity-50 tnum"
          >
            0
          </button>
          <button
            type="button"
            disabled={cooldownSec > 0 || entered.length === 0}
            onClick={handleBackspace}
            aria-label="Hapus satu angka"
            className="min-h-[58px] rounded-2xl border border-[#DCE2EC] bg-[#F8FAFC] text-sm font-bold text-[#0B1220] hover:bg-[#E2E8F0] disabled:opacity-40"
          >
            Hapus
          </button>
        </div>

        {/* Lupa PIN */}
        <div className="w-full pt-2">
          {!showResetFlow ? (
            <button
              type="button"
              onClick={() => setShowResetFlow(true)}
              className="min-h-[44px] px-3 text-xs font-semibold text-[#475569] underline hover:text-[#0B1220]"
            >
              Lupa PIN Lokal?
            </button>
          ) : (
            <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-left space-y-2.5">
              <p className="text-xs font-bold text-[#9F1D2C]">Reset PIN & Hapus Cache Lokal</p>
              <p className="text-[11px] leading-relaxed text-[#7F1D1D]">
                Demi keamanan saldo Anda, menghapus PIN tanpa kode lama juga akan mengosongkan data lokal di HP ini. Jika Anda sudah terhubung ke Google Sheet, data di Google Sheet tetap aman dan dapat disinkronkan ulang.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onResetPinAndClearLocal}
                  className="flex-1 min-h-[42px] rounded-xl bg-[#9F1D2C] px-3 text-xs font-bold text-white"
                >
                  Ya, Reset PIN & Data Lokal
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetFlow(false)}
                  className="min-h-[42px] rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs font-bold text-[#0B1220]"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
