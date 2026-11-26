import React, { useCallback, useEffect, useState } from 'react';
import {
  IconChart,
  IconReceiptAdd,
  IconReport,
  IconSheet,
  IconTransfer,
  IconWallet
} from './components/Icons';
import { InstallPwaBanner } from './components/InstallPwaBanner';
import { ReceiptLightboxModal } from './components/ReceiptLightboxModal';
import { SettingsSheetModal } from './components/SettingsSheetModal';
import {
  isCloudConfigured,
  loadLocalLedger,
  loadSyncConfig,
  pushActionToGoogleSheet,
  saveLocalLedger,
  saveSyncConfig,
  syncFromGoogleSheet
} from './lib/api';
import { getNowTime } from './lib/format';
import {
  applyAddAccount,
  applyAddTransaction,
  applyAddTransfer,
  applyDeleteAccount,
  applyDeleteTransaction,
  createSimulationDataset,
  type NewAccountInput,
  type NewTransactionInput,
  type NewTransferInput
} from './lib/ledger';
import type { ActiveTab, LedgerState, SyncConfig } from './lib/types';
import { AccountsView } from './views/AccountsView';
import { AnalyticsView } from './views/AnalyticsView';
import { DailyReportView } from './views/DailyReportView';
import { RecordTransactionView } from './views/RecordTransactionView';
import { TransferView } from './views/TransferView';

export function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<ActiveTab>('accounts');
  const [ledger, setLedger] = useState<LedgerState>(() => loadLocalLedger());
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => loadSyncConfig());

  const [preselectedAccountId, setPreselectedAccountId] = useState<string | undefined>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption: string } | null>(
    null
  );

  useEffect(() => {
    saveLocalLedger(ledger);
  }, [ledger]);

  const performCloudSync = useCallback(async (cfg: SyncConfig) => {
    if (!isCloudConfigured(cfg)) return;
    setIsBusy(true);
    setSyncError(null);
    try {
      const result = await syncFromGoogleSheet(cfg);
      setLedger(result.ledger);
      const updatedCfg: SyncConfig = {
        ...cfg,
        spreadsheetName: result.spreadsheetName || cfg.spreadsheetName,
        spreadsheetUrl: result.spreadsheetUrl || cfg.spreadsheetUrl,
        lastSyncedAt: getNowTime()
      };
      setSyncConfig(updatedCfg);
      saveSyncConfig(updatedCfg);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Gagal sinkronisasi Google Sheet.');
    } finally {
      setIsBusy(false);
    }
  }, []);

  useEffect(() => {
    if (isCloudConfigured(syncConfig)) {
      void performCloudSync(syncConfig);
    }
    // Jalankan sekali saat aplikasi dibuka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveAndSyncConfig = async (nextCfg: SyncConfig) => {
    setIsBusy(true);
    setSyncError(null);
    try {
      const result = await syncFromGoogleSheet(nextCfg);
      setLedger(result.ledger);
      const saved: SyncConfig = {
        ...nextCfg,
        spreadsheetName: result.spreadsheetName,
        spreadsheetUrl: result.spreadsheetUrl,
        lastSyncedAt: getNowTime()
      };
      setSyncConfig(saved);
      saveSyncConfig(saved);
      setIsSettingsOpen(false);
      setBannerNotice(`Tersambung ke Google Sheet: ${result.spreadsheetName || 'Aktif'}`);
      setTimeout(() => setBannerNotice(null), 3500);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Koneksi gagal.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDisconnectCloud = () => {
    const emptyCfg: SyncConfig = { scriptUrl: '', secretPin: '' };
    setSyncConfig(emptyCfg);
    saveSyncConfig(emptyCfg);
    setSyncError(null);
    setIsSettingsOpen(false);
  };

  const handleAddAccount = async (input: NewAccountInput) => {
    const id = `acc_${Date.now()}`;
    if (isCloudConfigured(syncConfig)) {
      setIsBusy(true);
      try {
        const remote = await pushActionToGoogleSheet(syncConfig, 'addAccount', {
          id,
          ...input
        });
        setLedger(remote);
      } finally {
        setIsBusy(false);
      }
    } else {
      setLedger((prev) => applyAddAccount(prev, input, id));
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (isCloudConfigured(syncConfig)) {
      setIsBusy(true);
      try {
        const remote = await pushActionToGoogleSheet(syncConfig, 'deleteAccount', {
          id: accountId
        });
        setLedger(remote);
      } finally {
        setIsBusy(false);
      }
    } else {
      setLedger((prev) => applyDeleteAccount(prev, accountId));
    }
  };

  const handleSaveTransaction = async (
    input: NewTransactionInput,
    receiptBase64?: string
  ) => {
    const id = `tx_${Date.now()}`;
    if (isCloudConfigured(syncConfig)) {
      setIsBusy(true);
      try {
        const remote = await pushActionToGoogleSheet(syncConfig, 'addTransaction', {
          id,
          date: input.date,
          time: input.time,
          kind: input.kind,
          amount: input.amount,
          category: input.category,
          note: input.note,
          accountId: input.accountId,
          receiptBase64,
          receiptFileName: input.receiptFileName
        });
        setLedger(remote);
      } finally {
        setIsBusy(false);
      }
    } else {
      setLedger((prev) => applyAddTransaction(prev, input, id));
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (isCloudConfigured(syncConfig)) {
      setIsBusy(true);
      try {
        const remote = await pushActionToGoogleSheet(syncConfig, 'deleteTransaction', {
          id: txId
        });
        setLedger(remote);
      } finally {
        setIsBusy(false);
      }
    } else {
      setLedger((prev) => applyDeleteTransaction(prev, txId));
    }
  };

  const handleSaveTransfer = async (input: NewTransferInput) => {
    const id = `trf_${Date.now()}`;
    if (isCloudConfigured(syncConfig)) {
      setIsBusy(true);
      try {
        const remote = await pushActionToGoogleSheet(syncConfig, 'addTransfer', {
          id,
          ...input
        });
        setLedger(remote);
      } finally {
        setIsBusy(false);
      }
    } else {
      setLedger((prev) => applyAddTransfer(prev, input, id));
    }
  };

  const cloudActive = isCloudConfigured(syncConfig);
  const hasSimulationData = ledger.accounts.some((a) => a.isSimulation);

  const navItems: Array<{
    key: ActiveTab;
    label: string;
    icon: React.ReactElement;
  }> = [
    { key: 'accounts', label: 'Rekening', icon: <IconWallet className="w-4 h-4" /> },
    { key: 'record', label: 'Catat', icon: <IconReceiptAdd className="w-4 h-4" /> },
    { key: 'analytics', label: 'Analitik', icon: <IconChart className="w-4 h-4" /> },
    { key: 'transfer', label: 'Transfer', icon: <IconTransfer className="w-4 h-4" /> },
    { key: 'report', label: 'Laporan', icon: <IconReport className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-dvh w-full flex justify-center bg-[#E4E9F0]">
      <div className="w-full max-w-[430px] min-h-dvh bg-[#F3F5F8] flex flex-col shadow-lg border-x border-[#CFD8E3]">
        {/* Header Aplikasi */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-[#DCE2EC] px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="./icon-192.png"
              alt="Logo KasPresisi"
              width={38}
              height={38}
              fetchPriority="high"
              className="h-9.5 w-9.5 rounded-xl object-cover shrink-0 border border-[#DCE2EC]"
            />
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-[#0B1220] truncate">
                KasPresisi
              </h1>
              <p className="text-[11px] font-medium text-[#475569] truncate">
                {cloudActive
                  ? `Sheet: ${syncConfig.spreadsheetName || 'Tersambung'}`
                  : 'Mode Lokal HP (Siap Sambung Sheet)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {cloudActive && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void performCloudSync(syncConfig)}
                aria-label="Segarkan data dari Google Sheet"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#DCE2EC] bg-[#F8FAFC] px-2.5 text-xs font-bold text-[#0B1220] hover:bg-[#E2E8F0]"
              >
                {isBusy ? '...' : 'Sync'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
                cloudActive
                  ? 'bg-[#ECFDF5] text-[#0D6848] border border-[#A7F3D0]'
                  : 'bg-[#0B1220] text-white hover:bg-[#1E293B]'
              }`}
            >
              <IconSheet className="w-4 h-4" />
              <span>{cloudActive ? 'Sheet Aktif' : 'Google Sheet'}</span>
            </button>
          </div>
        </header>

        {/* Konten Utama */}
        <main className="flex-1 px-4 pt-4 pb-24">
          <InstallPwaBanner />

          {bannerNotice && (
            <div
              role="status"
              className="mb-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-3.5 py-2.5 text-xs font-bold text-[#0D6848]"
            >
              {bannerNotice}
            </div>
          )}

          {syncError && !isSettingsOpen && (
            <div
              role="alert"
              className="mb-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3.5 py-2.5 text-xs text-[#9F1D2C] flex items-center justify-between gap-2"
            >
              <span>Sinkronisasi Sheet gagal: {syncError}</span>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="shrink-0 font-bold underline"
              >
                Periksa
              </button>
            </div>
          )}

          {activeTab === 'accounts' && (
            <AccountsView
              accounts={ledger.accounts}
              transactions={ledger.transactions}
              isBusy={isBusy}
              onAddAccount={handleAddAccount}
              onDeleteAccount={handleDeleteAccount}
              onQuickRecordForAccount={(accId) => {
                setPreselectedAccountId(accId);
                setActiveTab('record');
              }}
              onLoadSimulation={() => setLedger(createSimulationDataset())}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}

          {activeTab === 'record' && (
            <RecordTransactionView
              accounts={ledger.accounts}
              preselectedAccountId={preselectedAccountId}
              isBusy={isBusy}
              onSaveTransaction={handleSaveTransaction}
              onGoToAddAccount={() => setActiveTab('accounts')}
              onPreviewReceipt={(url, caption) => setLightboxImage({ url, caption })}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              accounts={ledger.accounts}
              transactions={ledger.transactions}
              isBusy={isBusy}
              onDeleteTransaction={handleDeleteTransaction}
              onPreviewReceipt={(url, caption) => setLightboxImage({ url, caption })}
              onGoToRecord={() => setActiveTab('record')}
            />
          )}

          {activeTab === 'transfer' && (
            <TransferView
              accounts={ledger.accounts}
              transfers={ledger.transfers}
              isBusy={isBusy}
              onSaveTransfer={handleSaveTransfer}
              onGoToAddAccount={() => setActiveTab('accounts')}
            />
          )}

          {activeTab === 'report' && (
            <DailyReportView
              ledger={ledger}
              onPreviewReceipt={(url, caption) => setLightboxImage({ url, caption })}
              onGoToRecord={() => setActiveTab('record')}
            />
          )}
        </main>

        {/* Navigasi Bawah 5 Tab */}
        <nav
          aria-label="Menu utama aplikasi"
          className="fixed bottom-0 z-30 w-full max-w-[430px] bg-white border-t border-[#DCE2EC] px-2 pt-1.5 safe-bottom"
        >
          <div className="grid grid-cols-5 gap-1">
            {navItems.map((item) => {
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] transition-colors ${
                    active
                      ? 'bg-[#0F4C81] font-bold text-white'
                      : 'bg-transparent font-medium text-[#475569] hover:bg-[#F3F5F8]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <SettingsSheetModal
          isOpen={isSettingsOpen}
          config={syncConfig}
          isSyncing={isBusy}
          syncError={syncError}
          hasSimulationData={hasSimulationData}
          onClose={() => setIsSettingsOpen(false)}
          onSaveAndSync={handleSaveAndSyncConfig}
          onDisconnect={handleDisconnectCloud}
          onLoadSimulation={() => {
            setLedger(createSimulationDataset());
            setIsSettingsOpen(false);
          }}
          onClearLocalData={() => {
            setLedger({ accounts: [], transactions: [], transfers: [] });
            setIsSettingsOpen(false);
          }}
        />

        <ReceiptLightboxModal
          imageUrl={lightboxImage?.url || null}
          caption={lightboxImage?.caption}
          onClose={() => setLightboxImage(null)}
        />
      </div>
    </div>
  );
}
