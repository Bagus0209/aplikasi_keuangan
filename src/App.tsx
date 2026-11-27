import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BudgetCategoryModal } from './components/BudgetCategoryModal';
import { EditTransactionModal } from './components/EditTransactionModal';
import {
  IconChart,
  IconLock,
  IconReceiptAdd,
  IconReport,
  IconSheet,
  IconTransfer,
  IconWallet
} from './components/Icons';
import { InstallPwaBanner } from './components/InstallPwaBanner';
import { PinLockScreen } from './components/PinLockScreen';
import { ReceiptLightboxModal } from './components/ReceiptLightboxModal';
import { SettingsSheetModal } from './components/SettingsSheetModal';
import {
  isCloudConfigured,
  loadLocalLedger,
  loadSyncConfig,
  pushActionToGoogleSheet,
  saveLocalLedger,
  saveSyncConfig,
  syncFromGoogleSheet,
  syncPreferencesToGoogleSheet
} from './lib/api';
import { getNowTime, getTodayIso } from './lib/format';
import {
  applyAddAccount,
  applyAddTransaction,
  applyAddTransfer,
  applyDeleteAccount,
  applyDeleteTransaction,
  applyUpdateAccount,
  applyUpdateTransaction,
  createSimulationDataset,
  type NewAccountInput,
  type NewTransactionInput,
  type NewTransferInput,
  type UpdateAccountInput,
  type UpdateTransactionInput
} from './lib/ledger';
import {
  clearPinLockConfig,
  loadPinLockConfig,
  savePinLockConfig
} from './lib/pinLock';
import {
  addCustomCategory,
  computeMonthlyBudgetStatuses,
  loadUserPreferences,
  saveUserPreferences
} from './lib/preferences';
import type {
  ActiveTab,
  LedgerState,
  PinLockConfig,
  SyncConfig,
  Transaction,
  TransactionKind,
  UserPreferences
} from './lib/types';
import { AccountsView } from './views/AccountsView';
import { AnalyticsView } from './views/AnalyticsView';
import { DailyReportView } from './views/DailyReportView';
import { RecordTransactionView } from './views/RecordTransactionView';
import { TransferView } from './views/TransferView';

export function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<ActiveTab>('accounts');
  const [ledger, setLedger] = useState<LedgerState>(() => loadLocalLedger());
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => loadSyncConfig());
  const [preferences, setPreferences] = useState<UserPreferences>(() => loadUserPreferences());
  const [pinConfig, setPinConfig] = useState<PinLockConfig>(() => loadPinLockConfig());
  const [isLocked, setIsLocked] = useState<boolean>(() => loadPinLockConfig().enabled);

  const [preselectedAccountId, setPreselectedAccountId] = useState<string | undefined>();
  const [preselectedTransferFromId, setPreselectedTransferFromId] = useState<string | undefined>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [budgetModalSection, setBudgetModalSection] = useState<'budgets' | 'categories' | null>(
    null
  );
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption: string } | null>(
    null
  );

  const hiddenSinceRef = useRef<number | null>(null);

  useEffect(() => {
    saveLocalLedger(ledger);
  }, [ledger]);

  useEffect(() => {
    saveUserPreferences(preferences);
  }, [preferences]);

  // Auto-lock ketika aplikasi kembali dari background sesuai autoLockMinutes
  useEffect(() => {
    if (!pinConfig.enabled || pinConfig.autoLockMinutes <= 0) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenSinceRef.current = Date.now();
      } else if (document.visibilityState === 'visible' && hiddenSinceRef.current !== null) {
        const elapsedMs = Date.now() - hiddenSinceRef.current;
        hiddenSinceRef.current = null;
        if (elapsedMs >= pinConfig.autoLockMinutes * 60_000) {
          setIsLocked(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pinConfig.enabled, pinConfig.autoLockMinutes]);

  const showTempNotice = useCallback((text: string) => {
    setBannerNotice(text);
    window.setTimeout(() => setBannerNotice(null), 3500);
  }, []);

  const performCloudSync = useCallback(async (cfg: SyncConfig) => {
    if (!isCloudConfigured(cfg)) return;
    setIsBusy(true);
    setSyncError(null);
    try {
      const result = await syncFromGoogleSheet(cfg);
      setLedger(result.ledger);
      if (result.preferences) {
        setPreferences(result.preferences);
      }
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
      if (result.preferences) {
        setPreferences(result.preferences);
      }
      const saved: SyncConfig = {
        ...nextCfg,
        spreadsheetName: result.spreadsheetName,
        spreadsheetUrl: result.spreadsheetUrl,
        lastSyncedAt: getNowTime()
      };
      setSyncConfig(saved);
      saveSyncConfig(saved);
      setIsSettingsOpen(false);
      showTempNotice(`Tersambung ke Google Sheet: ${result.spreadsheetName || 'Aktif'}`);
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

  const handlePreferencesChange = (nextPrefs: UserPreferences) => {
    setPreferences(nextPrefs);
    if (isCloudConfigured(syncConfig)) {
      void syncPreferencesToGoogleSheet(syncConfig, nextPrefs);
    }
  };

  const handleAddCustomCategory = (kind: TransactionKind, name: string) => {
    const nextPrefs = addCustomCategory(preferences, kind, name);
    handlePreferencesChange(nextPrefs);
  };

  const handleUpdatePinConfig = (nextPin: PinLockConfig) => {
    setPinConfig(nextPin);
    savePinLockConfig(nextPin);
  };

  const handleDisablePin = () => {
    const cleared = clearPinLockConfig();
    setPinConfig(cleared);
    setIsLocked(false);
  };

  const handleResetPinAndClearLocal = () => {
    const cleared = clearPinLockConfig();
    setPinConfig(cleared);
    setLedger({ accounts: [], transactions: [], transfers: [] });
    setIsLocked(false);
    showTempNotice('PIN lokal direset dan data lokal di perangkat telah dikosongkan.');
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

  const handleUpdateAccount = async (input: UpdateAccountInput) => {
    if (isCloudConfigured(syncConfig)) {
      setIsBusy(true);
      try {
        const remote = await pushActionToGoogleSheet(syncConfig, 'updateAccount', {
          ...input
        });
        setLedger(remote);
        showTempNotice(`Rekening "${input.name}" berhasil diperbarui.`);
      } finally {
        setIsBusy(false);
      }
    } else {
      setLedger((prev) => applyUpdateAccount(prev, input));
      showTempNotice(`Rekening "${input.name}" berhasil diperbarui.`);
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

  const handleUpdateTransaction = async (input: UpdateTransactionInput) => {
    if (isCloudConfigured(syncConfig)) {
      setIsBusy(true);
      try {
        const remote = await pushActionToGoogleSheet(syncConfig, 'updateTransaction', {
          ...input
        });
        setLedger(remote);
        showTempNotice('Perubahan transaksi tersimpan dan saldo rekening diperbarui.');
      } finally {
        setIsBusy(false);
      }
    } else {
      setLedger((prev) => applyUpdateTransaction(prev, input));
      showTempNotice('Perubahan transaksi tersimpan dan saldo rekening diperbarui.');
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

  const currentMonthPrefix = getTodayIso().slice(0, 7);
  const budgetAlerts = computeMonthlyBudgetStatuses(
    ledger.transactions,
    preferences,
    currentMonthPrefix
  ).filter((item) => item.status !== 'safe');

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

  if (isLocked && pinConfig.enabled) {
    return (
      <PinLockScreen
        config={pinConfig}
        onUnlock={() => setIsLocked(false)}
        onResetPinAndClearLocal={handleResetPinAndClearLocal}
      />
    );
  }

  return (
    <div className="min-h-dvh w-full flex justify-center bg-[#FAFAFB] md:bg-[#E4E9F0]">
      <div className="w-full md:max-w-[430px] min-h-dvh bg-[#FAFAFB] flex flex-col md:shadow-lg md:border-x md:border-[#CFD8E3]">
        {/* Header Aplikasi */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-[#EEF0F4] px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="./icon-192.png"
              alt="Logo KasPresisi"
              width={32}
              height={32}
              fetchPriority="high"
              className="h-8 w-8 rounded-lg object-cover shrink-0 border border-[#DCE2EC]"
            />
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-[#0B1220] truncate">
                KasPresisi
              </h1>
              <p className="text-[10px] font-medium text-[#475569] truncate">
                {cloudActive
                  ? `Sheet: ${syncConfig.spreadsheetName || 'Tersambung'}`
                  : 'Mode Lokal HP (Siap Sambung Sheet)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {pinConfig.enabled && (
              <button
                type="button"
                onClick={() => setIsLocked(true)}
                aria-label="Kunci aplikasi sekarang"
                className="inline-flex min-h-[44px] min-w-[40px] items-center justify-center rounded-xl border border-[#DCE2EC] bg-[#F8FAFC] text-[#0B1220] hover:bg-[#E2E8F0]"
              >
                <IconLock className="w-4 h-4" />
              </button>
            )}
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
              budgetAlerts={budgetAlerts}
              isBusy={isBusy}
              onAddAccount={handleAddAccount}
              onUpdateAccount={handleUpdateAccount}
              onDeleteAccount={handleDeleteAccount}
              onQuickRecordForAccount={(accId) => {
                setPreselectedAccountId(accId);
                setActiveTab('record');
              }}
              onQuickTransferFromAccount={(accId) => {
                setPreselectedTransferFromId(accId);
                setActiveTab('transfer');
              }}
              onOpenReport={() => setActiveTab('report')}
              onOpenBudgets={() => setActiveTab('analytics')}
              onLoadSimulation={() => setLedger(createSimulationDataset())}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}

          {activeTab === 'record' && (
            <RecordTransactionView
              accounts={ledger.accounts}
              transactions={ledger.transactions}
              preferences={preferences}
              preselectedAccountId={preselectedAccountId}
              isBusy={isBusy}
              onSaveTransaction={handleSaveTransaction}
              onAddCustomCategory={handleAddCustomCategory}
              onOpenBudgetManager={() => setBudgetModalSection('budgets')}
              onGoToAddAccount={() => setActiveTab('accounts')}
              onPreviewReceipt={(url, caption) => setLightboxImage({ url, caption })}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              accounts={ledger.accounts}
              transactions={ledger.transactions}
              preferences={preferences}
              isBusy={isBusy}
              onEditTransaction={(tx) => setEditingTx(tx)}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenBudgetModal={(section) => setBudgetModalSection(section)}
              onPreviewReceipt={(url, caption) => setLightboxImage({ url, caption })}
              onGoToRecord={() => setActiveTab('record')}
            />
          )}

          {activeTab === 'transfer' && (
            <TransferView
              accounts={ledger.accounts}
              transfers={ledger.transfers}
              preselectedFromId={preselectedTransferFromId}
              isBusy={isBusy}
              onSaveTransfer={handleSaveTransfer}
              onGoToAddAccount={() => setActiveTab('accounts')}
            />
          )}

          {activeTab === 'report' && (
            <DailyReportView
              ledger={ledger}
              onEditTransaction={(tx) => setEditingTx(tx)}
              onPreviewReceipt={(url, caption) => setLightboxImage({ url, caption })}
              onGoToRecord={() => setActiveTab('record')}
            />
          )}
        </main>

        {/* Navigasi Bawah 5 Tab */}
        <nav
          aria-label="Menu utama aplikasi"
          className="fixed bottom-0 left-0 right-0 md:left-1/2 md:right-auto md:-translate-x-1/2 z-30 w-full md:max-w-[430px] bg-white border-t border-[#DCE2EC] px-2 pt-1.5 safe-bottom"
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
          pinConfig={pinConfig}
          isSyncing={isBusy}
          syncError={syncError}
          hasSimulationData={hasSimulationData}
          onClose={() => setIsSettingsOpen(false)}
          onSaveAndSync={handleSaveAndSyncConfig}
          onDisconnect={handleDisconnectCloud}
          onUpdatePinConfig={handleUpdatePinConfig}
          onDisablePin={handleDisablePin}
          onOpenBudgetManager={() => setBudgetModalSection('budgets')}
          onLoadSimulation={() => {
            setLedger(createSimulationDataset());
            setIsSettingsOpen(false);
          }}
          onClearLocalData={() => {
            setLedger({ accounts: [], transactions: [], transfers: [] });
            setIsSettingsOpen(false);
          }}
        />

        <EditTransactionModal
          transaction={editingTx}
          accounts={ledger.accounts}
          allTransactions={ledger.transactions}
          preferences={preferences}
          isBusy={isBusy}
          onClose={() => setEditingTx(null)}
          onSave={handleUpdateTransaction}
        />

        <BudgetCategoryModal
          isOpen={budgetModalSection !== null}
          preferences={preferences}
          initialSection={budgetModalSection || 'budgets'}
          onClose={() => setBudgetModalSection(null)}
          onChangePreferences={handlePreferencesChange}
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
