import React, { useEffect, useState } from 'react';
import { IconClose, IconSheet } from './Icons';
import { isCloudConfigured } from '../lib/api';
import type { SyncConfig } from '../lib/types';

interface SettingsSheetModalProps {
  isOpen: boolean;
  config: SyncConfig;
  isSyncing: boolean;
  syncError: string | null;
  hasSimulationData: boolean;
  onClose: () => void;
  onSaveAndSync: (nextConfig: SyncConfig) => Promise<void>;
  onDisconnect: () => void;
  onLoadSimulation: () => void;
  onClearLocalData: () => void;
}

export function SettingsSheetModal({
  isOpen,
  config,
  isSyncing,
  syncError,
  hasSimulationData,
  onClose,
  onSaveAndSync,
  onDisconnect,
  onLoadSimulation,
  onClearLocalData
}: SettingsSheetModalProps): React.ReactElement | null {
  const [scriptUrl, setScriptUrl] = useState(config.scriptUrl);
  const [secretPin, setSecretPin] = useState(config.secretPin);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setScriptUrl(config.scriptUrl);
    setSecretPin(config.secretPin);
    setConfirmClear(false);
  }, [config, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const connected = isCloudConfigured(config);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveAndSync({
      ...config,
      scriptUrl: scriptUrl.trim(),
      secretPin: secretPin.trim()
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0B1220]/60 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-sheet-title"
    >
      <div className="w-full max-w-[430px] max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl border border-[#DCE2EC]">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#DCE2EC]">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F4C81] text-white">
              <IconSheet className="w-5 h-5" />
            </span>
            <div>
              <h2 id="modal-sheet-title" className="text-base font-bold text-[#0B1220]">
                Koneksi Google Sheet Pribadi
              </h2>
              <p className="text-xs text-[#475569]">
                Sinkronkan saldo, mutasi, dan foto struk Google Drive
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#DCE2EC] text-[#0B1220] hover:bg-[#F3F5F8] active:bg-[#E2E8F0]"
          >
            <IconClose />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {connected && config.spreadsheetName && (
            <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-3 text-xs text-[#0D6848]">
              <p className="font-bold">Terhubung ke: {config.spreadsheetName}</p>
              {config.lastSyncedAt && (
                <p className="mt-0.5">Sinkron terakhir: {config.lastSyncedAt}</p>
              )}
              {config.spreadsheetUrl && (
                <a
                  href={config.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block font-bold underline"
                >
                  Buka File Google Sheet di Tab Baru
                </a>
              )}
            </div>
          )}

          {syncError && (
            <div
              role="alert"
              className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-3 text-xs text-[#9F1D2C]"
            >
              <p className="font-bold">Gagal Menyambungkan Google Sheet</p>
              <p className="mt-1">{syncError}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="gas-url"
              className="block text-xs font-bold text-[#0B1220] mb-1.5"
            >
              Web App URL Google Apps Script
            </label>
            <input
              id="gas-url"
              type="url"
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#0B1220] placeholder:text-[#64748B]"
              required
            />
          </div>

          <div>
            <label
              htmlFor="gas-pin"
              className="block text-xs font-bold text-[#0B1220] mb-1.5"
            >
              PIN / Kunci Rahasia Pribadi
            </label>
            <input
              id="gas-pin"
              type="password"
              value={secretPin}
              onChange={(e) => setSecretPin(e.target.value)}
              placeholder="Masukkan SECRET_PIN dari Code.gs"
              className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#0B1220] placeholder:text-[#64748B]"
              required
            />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={isSyncing || !scriptUrl.trim() || !secretPin.trim()}
              className="w-full min-h-[48px] rounded-xl bg-[#0F4C81] px-4 py-3 text-sm font-bold text-white hover:bg-[#09355C] active:bg-[#072846] disabled:bg-[#CBD5E1] disabled:text-[#475569]"
            >
              {isSyncing
                ? 'Sedang Menghubungi Google Sheet...'
                : 'Simpan & Sinkronkan Google Sheet'}
            </button>

            {connected && (
              <button
                type="button"
                onClick={onDisconnect}
                className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-xs font-bold text-[#475569] hover:bg-[#F8FAFC]"
              >
                Putuskan Koneksi Cloud (Gunakan Mode Lokal HP)
              </button>
            )}
          </div>
        </form>

        <div className="mt-5 pt-4 border-t border-[#DCE2EC] space-y-2.5">
          <p className="text-xs font-bold text-[#0B1220]">Pengelolaan Data Lokal di Perangkat</p>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={onLoadSimulation}
              className="w-full min-h-[44px] rounded-xl border border-[#0F4C81] bg-[#F8FAFC] px-3.5 py-2 text-xs font-bold text-[#0F4C81] hover:bg-[#EFF6FF]"
            >
              {hasSimulationData
                ? 'Muat Ulang Data Contoh [SIMULASI SALDO]'
                : 'Isi Contoh Data Uji Coba [SIMULASI SALDO]'}
            </button>

            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="w-full min-h-[44px] rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2 text-xs font-bold text-[#9F1D2C] hover:bg-[#FEE2E2]"
              >
                Kosongkan Data Lokal di HP Ini
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearLocalData();
                    setConfirmClear(false);
                  }}
                  className="flex-1 min-h-[44px] rounded-xl bg-[#9F1D2C] px-3 py-2 text-xs font-bold text-white"
                >
                  Ya, Hapus Data Lokal
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-[44px] rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-bold text-[#0B1220]"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
