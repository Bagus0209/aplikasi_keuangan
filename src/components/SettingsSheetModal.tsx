import React, { useEffect, useState } from 'react';
import { IconClose, IconLock, IconSheet, IconTarget } from './Icons';
import { isCloudConfigured } from '../lib/api';
import { createPinLockConfig, verifyLocalPin } from '../lib/pinLock';
import { checkPwaUpdateNow } from '../lib/pwaUpdater';
import type { PinLockConfig, SyncConfig } from '../lib/types';

interface SettingsSheetModalProps {
  isOpen: boolean;
  config: SyncConfig;
  pinConfig: PinLockConfig;
  isSyncing: boolean;
  syncError: string | null;
  hasSimulationData: boolean;
  onClose: () => void;
  onSaveAndSync: (nextConfig: SyncConfig) => Promise<void>;
  onDisconnect: () => void;
  onUpdatePinConfig: (nextPin: PinLockConfig) => void;
  onDisablePin: () => void;
  onOpenBudgetManager: () => void;
  onLoadSimulation: () => void;
  onClearLocalData: () => void;
}

type PinFormMode = 'idle' | 'setup' | 'change' | 'disable';

export function SettingsSheetModal({
  isOpen,
  config,
  pinConfig,
  isSyncing,
  syncError,
  hasSimulationData,
  onClose,
  onSaveAndSync,
  onDisconnect,
  onUpdatePinConfig,
  onDisablePin,
  onOpenBudgetManager,
  onLoadSimulation,
  onClearLocalData
}: SettingsSheetModalProps): React.ReactElement | null {
  const [scriptUrl, setScriptUrl] = useState(config.scriptUrl);
  const [secretPin, setSecretPin] = useState(config.secretPin);
  const [confirmClear, setConfirmClear] = useState(false);
  const [updateStatusMsg, setUpdateStatusMsg] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // State pengaturan Kunci PIN Lokal
  const [pinMode, setPinMode] = useState<PinFormMode>('idle');
  const [pinLength, setPinLength] = useState<4 | 6>(pinConfig.pinLength);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(pinConfig.autoLockMinutes);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinMsg, setPinMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setScriptUrl(config.scriptUrl);
    setSecretPin(config.secretPin);
    setConfirmClear(false);
    setPinMode('idle');
    setPinLength(pinConfig.pinLength);
    setAutoLockMinutes(pinConfig.autoLockMinutes);
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinMsg(null);
  }, [config, pinConfig, isOpen]);

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

  const resetPinInputs = () => {
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinMode('idle');
  };

  const handleSavePinForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg(null);

    if (pinMode === 'change' || pinMode === 'disable') {
      const validOld = await verifyLocalPin(currentPinInput, pinConfig);
      if (!validOld) {
        setPinMsg({ type: 'err', text: 'PIN lama tidak cocok.' });
        return;
      }
      if (pinMode === 'disable') {
        onDisablePin();
        resetPinInputs();
        setPinMsg({ type: 'ok', text: 'Kunci PIN lokal telah dinonaktifkan.' });
        return;
      }
    }

    const cleanNew = newPinInput.replace(/[^\d]/g, '');
    const cleanConfirm = confirmPinInput.replace(/[^\d]/g, '');
    if (cleanNew.length !== pinLength) {
      setPinMsg({ type: 'err', text: `PIN baru harus tepat ${pinLength} angka.` });
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setPinMsg({ type: 'err', text: 'Konfirmasi PIN baru tidak sama.' });
      return;
    }

    try {
      const nextCfg = await createPinLockConfig(cleanNew, pinLength, autoLockMinutes);
      onUpdatePinConfig(nextCfg);
      resetPinInputs();
      setPinMsg({
        type: 'ok',
        text: `Kunci PIN lokal (${pinLength} angka) berhasil diaktifkan.`
      });
    } catch (err) {
      setPinMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menyimpan PIN lokal.'
      });
    }
  };

  const handleChangeAutoLock = (mins: number) => {
    setAutoLockMinutes(mins);
    if (pinConfig.enabled) {
      onUpdatePinConfig({
        ...pinConfig,
        autoLockMinutes: mins
      });
      setPinMsg({ type: 'ok', text: 'Pengaturan kunci otomatis diperbarui.' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#0B1220]/60 p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-sheet-title"
    >
      <div className="w-full md:max-w-[430px] max-h-[92dvh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-white p-5 shadow-xl border border-[#DCE2EC]">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#DCE2EC]">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F4C81] text-white">
              <IconSheet className="w-5 h-5" />
            </span>
            <div>
              <h2 id="modal-sheet-title" className="text-base font-bold text-[#0B1220]">
                Pengaturan & Koneksi Sheet
              </h2>
              <p className="text-xs text-[#475569]">
                Sinkronisasi Google Sheet, kunci PIN lokal, dan anggaran
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

        {/* Bagian 1: Koneksi Google Sheet */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
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
              PIN / Kunci Rahasia Google Sheet
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
              className="w-full min-h-[46px] rounded-xl bg-[#0F4C81] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#09355C] active:bg-[#072846] disabled:bg-[#CBD5E1] disabled:text-[#475569]"
            >
              {isSyncing
                ? 'Sedang Menghubungi Google Sheet...'
                : 'Simpan & Sinkronkan Google Sheet'}
            </button>

            {connected && (
              <button
                type="button"
                onClick={onDisconnect}
                className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-bold text-[#475569] hover:bg-[#F8FAFC]"
              >
                Putuskan Koneksi Cloud (Gunakan Mode Lokal HP)
              </button>
            )}
          </div>
        </form>

        {/* Bagian 2: Keamanan Kunci PIN Lokal */}
        <section className="mt-5 pt-4 border-t border-[#DCE2EC] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <IconLock className="w-4 h-4 text-[#0F4C81]" />
              <p className="text-xs font-bold text-[#0B1220]">Kunci PIN Lokal (Privasi Saldo)</p>
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                pinConfig.enabled
                  ? 'bg-[#ECFDF5] text-[#0D6848] border-[#A7F3D0]'
                  : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1]'
              }`}
            >
              {pinConfig.enabled ? `Aktif (${pinConfig.pinLength} Digit)` : 'Nonaktif'}
            </span>
          </div>

          {pinMsg && (
            <p
              role={pinMsg.type === 'err' ? 'alert' : 'status'}
              className={`rounded-xl border p-2.5 text-xs font-semibold ${
                pinMsg.type === 'err'
                  ? 'bg-[#FEF2F2] border-[#FECACA] text-[#9F1D2C]'
                  : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#0D6848]'
              }`}
            >
              {pinMsg.text}
            </p>
          )}

          {pinMode === 'idle' ? (
            <div className="space-y-2.5">
              {!pinConfig.enabled ? (
                <button
                  type="button"
                  onClick={() => {
                    setPinMsg(null);
                    setPinMode('setup');
                  }}
                  className="w-full min-h-[44px] rounded-xl border border-[#0F4C81] bg-[#EFF6FF] px-3.5 py-2 text-xs font-bold text-[#0F4C81] hover:bg-[#DBEAFE]"
                >
                  Aktifkan Kunci PIN Lokal
                </button>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-bold text-[#475569]">
                      Kunci Otomatis
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { mins: 0, label: 'Saat dibuka' },
                        { mins: 1, label: '1 menit' },
                        { mins: 5, label: '5 menit' }
                      ].map((opt) => (
                        <button
                          key={opt.mins}
                          type="button"
                          onClick={() => handleChangeAutoLock(opt.mins)}
                          className={`min-h-[38px] rounded-lg border text-[11px] font-bold ${
                            autoLockMinutes === opt.mins
                              ? 'border-[#0F4C81] bg-[#0F4C81] text-white'
                              : 'border-[#CBD5E1] bg-white text-[#475569]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPinMsg(null);
                        setPinMode('change');
                      }}
                      className="min-h-[42px] rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs font-bold text-[#0B1220] hover:bg-[#F8FAFC]"
                    >
                      Ubah PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPinMsg(null);
                        setPinMode('disable');
                      }}
                      className="min-h-[42px] rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 text-xs font-bold text-[#9F1D2C]"
                    >
                      Matikan PIN
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSavePinForm} className="rounded-xl bg-[#F8FAFC] border border-[#DCE2EC] p-3 space-y-2.5">
              {(pinMode === 'change' || pinMode === 'disable') && (
                <div>
                  <label htmlFor="pin-current" className="block text-[11px] font-bold text-[#0B1220] mb-1">
                    Masukkan PIN Lama ({pinConfig.pinLength} angka)
                  </label>
                  <input
                    id="pin-current"
                    type="password"
                    inputMode="numeric"
                    maxLength={pinConfig.pinLength}
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="••••"
                    className="w-full min-h-[42px] rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm font-bold tracking-widest text-[#0B1220] tnum"
                    required
                  />
                </div>
              )}

              {pinMode !== 'disable' && (
                <>
                  <div>
                    <span className="block text-[11px] font-bold text-[#0B1220] mb-1">
                      Panjang PIN
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {([4, 6] as const).map((len) => (
                        <button
                          key={len}
                          type="button"
                          onClick={() => {
                            setPinLength(len);
                            setNewPinInput('');
                            setConfirmPinInput('');
                          }}
                          className={`min-h-[38px] rounded-lg border text-xs font-bold ${
                            pinLength === len
                              ? 'border-[#0F4C81] bg-[#0F4C81] text-white'
                              : 'border-[#CBD5E1] bg-white text-[#475569]'
                          }`}
                        >
                          {len} Digit
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="pin-new" className="block text-[11px] font-bold text-[#0B1220] mb-1">
                      PIN Baru ({pinLength} angka)
                    </label>
                    <input
                      id="pin-new"
                      type="password"
                      inputMode="numeric"
                      maxLength={pinLength}
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder={pinLength === 4 ? '4 angka' : '6 angka'}
                      className="w-full min-h-[42px] rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm font-bold tracking-widest text-[#0B1220] tnum"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="pin-confirm" className="block text-[11px] font-bold text-[#0B1220] mb-1">
                      Ulangi PIN Baru
                    </label>
                    <input
                      id="pin-confirm"
                      type="password"
                      inputMode="numeric"
                      maxLength={pinLength}
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="Ketik ulang PIN baru"
                      className="w-full min-h-[42px] rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm font-bold tracking-widest text-[#0B1220] tnum"
                      required
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetPinInputs}
                  className="min-h-[42px] rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-bold text-[#0B1220]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`flex-1 min-h-[42px] rounded-lg px-3 text-xs font-bold text-white ${
                    pinMode === 'disable' ? 'bg-[#9F1D2C]' : 'bg-[#0F4C81]'
                  }`}
                >
                  {pinMode === 'disable' ? 'Konfirmasi Matikan PIN' : 'Simpan PIN Lokal'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Bagian 3: Kategori & Anggaran Bulanan */}
        <section className="mt-5 pt-4 border-t border-[#DCE2EC] space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenBudgetManager();
            }}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2 text-xs font-bold text-[#0B1220] hover:bg-[#EFF6FF]"
          >
            <IconTarget className="w-4 h-4 text-[#0F4C81]" />
            <span>Kelola Kategori Kustom & Anggaran Bulanan</span>
          </button>

          <button
            type="button"
            disabled={isCheckingUpdate}
            onClick={async () => {
              setIsCheckingUpdate(true);
              setUpdateStatusMsg(null);
              const res = await checkPwaUpdateNow();
              setIsCheckingUpdate(false);
              if (res === 'updating') {
                setUpdateStatusMsg('Pembaruan ditemukan, aplikasi sedang memuat tampilan baru...');
              } else if (res === 'latest') {
                setUpdateStatusMsg('Aplikasi sudah memakai versi terbaru.');
              } else {
                setUpdateStatusMsg('Pembaruan otomatis aktif saat dibuka lewat HTTPS / PWA.');
              }
            }}
            className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-bold text-[#0F4C81] hover:bg-[#EFF6FF] disabled:opacity-60"
          >
            {isCheckingUpdate ? 'Memeriksa Pembaruan...' : 'Cek Pembaruan Tampilan Aplikasi'}
          </button>
          {updateStatusMsg && (
            <p role="status" className="text-[11px] font-semibold text-[#0D6848] px-1">
              {updateStatusMsg}
            </p>
          )}
        </section>

        {/* Bagian 4: Pengelolaan Data Lokal */}
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
