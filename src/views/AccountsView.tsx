import React, { useEffect, useState } from 'react';
import {
  AccountCardEmblem,
  IconCardWatermark,
  IconClose,
  IconEye,
  IconEyeOff,
  IconMoreDots,
  IconPlus,
  IconReport,
  IconSearch
} from '../components/Icons';
import {
  ACCOUNT_CARD_THEMES,
  loadAccountVisualMap,
  resolveAccountVisual,
  saveAccountVisual,
  type StoredAccountVisual
} from '../lib/accountTheme';
import {
  formatNumberInput,
  formatRupiah,
  getTodayIso,
  parseDigitsToNumber
} from '../lib/format';
import { computeTotalBalance, type NewAccountInput } from '../lib/ledger';
import type {
  Account,
  AccountColorTheme,
  AccountEmblemKind,
  AccountType,
  Transaction
} from '../lib/types';

interface AccountsViewProps {
  accounts: Account[];
  transactions: Transaction[];
  isBusy: boolean;
  onAddAccount: (input: NewAccountInput) => Promise<void>;
  onDeleteAccount: (accountId: string) => Promise<void>;
  onQuickRecordForAccount: (accountId: string) => void;
  onQuickTransferFromAccount: (accountId: string) => void;
  onOpenReport: () => void;
  onLoadSimulation: () => void;
  onOpenSettings: () => void;
}

type CategoryFilter = 'all' | AccountType;

export function AccountsView({
  accounts,
  transactions,
  isBusy,
  onAddAccount,
  onDeleteAccount,
  onQuickRecordForAccount,
  onQuickTransferFromAccount,
  onOpenReport,
  onLoadSimulation,
  onOpenSettings
}: AccountsViewProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [hideBalances, setHideBalances] = useState(false);
  const [showMonthlyInfo, setShowMonthlyInfo] = useState(false);

  const [visualMap, setVisualMap] = useState<Record<string, StoredAccountVisual>>(() =>
    loadAccountVisualMap()
  );

  // Modal Tambah Rekening
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [maskedNumber, setMaskedNumber] = useState('');
  const [roleTag, setRoleTag] = useState('');
  const [initialBalanceRaw, setInitialBalanceRaw] = useState('');
  const [pickedColor, setPickedColor] = useState<AccountColorTheme>('sage');
  const [pickedEmblem, setPickedEmblem] = useState<AccountEmblemKind>('bag');
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Detail & Aksi Rekening
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setSelectedAccountId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const totalBalance = computeTotalBalance(accounts);
  const currentMonth = getTodayIso().slice(0, 7);
  const monthTx = transactions.filter((t) => t.date.startsWith(currentMonth));
  const monthIncome = monthTx
    .filter((t) => t.kind === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthExpense = monthTx
    .filter((t) => t.kind === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const hasSimulation = accounts.some((a) => a.isSimulation);

  const filteredAccounts = accounts.filter((acc) => {
    const matchesType = categoryFilter === 'all' || acc.type === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      acc.name.toLowerCase().includes(q) ||
      acc.roleTag.toLowerCase().includes(q) ||
      acc.maskedNumber.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || null;
  const selectedAccountIndex = selectedAccount
    ? accounts.findIndex((a) => a.id === selectedAccount.id)
    : 0;

  const openAddSheet = () => {
    const nextColorOrder: AccountColorTheme[] = [
      'sage',
      'cream',
      'sky',
      'mint',
      'cyan',
      'sand'
    ];
    setPickedColor(nextColorOrder[accounts.length % nextColorOrder.length]);
    setPickedEmblem('bag');
    setFormError(null);
    setShowAddModal(true);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Nama rekening wajib diisi (contoh: Kantong Utama atau BCA).');
      return;
    }
    try {
      await onAddAccount({
        name: name.trim(),
        type,
        maskedNumber: maskedNumber.trim(),
        roleTag: roleTag.trim() || defaultRoleForType(type),
        initialBalance: parseDigitsToNumber(initialBalanceRaw),
        colorTheme: pickedColor,
        emblem: pickedEmblem
      });
      setName('');
      setMaskedNumber('');
      setRoleTag('');
      setInitialBalanceRaw('');
      setShowAddModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menambah rekening.');
    }
  };

  const handleUpdateAccountVisual = (
    accountId: string,
    patch: StoredAccountVisual
  ) => {
    const updated = saveAccountVisual(accountId, patch);
    setVisualMap(updated);
  };

  const formatBalanceText = (amount: number): string => {
    if (hideBalances) return 'Rp••••••••';
    return formatRupiah(amount).replace('Rp ', 'Rp');
  };

  return (
    <div className="space-y-3.5">
      {/* Bar Pencarian + Tombol Aksi Kanan (mirip referensi Kantong) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center rounded-xl bg-[#EEF0F3] px-3">
          <IconSearch className="w-4 h-4 text-[#6B7280] shrink-0" />
          <input
            type="search"
            aria-label="Cari rekening atau kantong"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Rekening"
            className="w-full min-h-[44px] bg-transparent pl-2.5 pr-2 text-sm text-[#111827] placeholder:text-[#6B7280] focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Pengaturan Google Sheet dan data"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#111827] hover:bg-[#E5E7EB]"
        >
          <IconMoreDots className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onOpenReport}
          aria-label="Buka laporan harian"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#111827] hover:bg-[#E5E7EB]"
        >
          <IconReport className="w-5 h-5" />
        </button>
      </div>

      {/* Tab Filter Kategori + Tombol Plus (+) */}
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex items-center gap-1 overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label="Filter jenis rekening"
        >
          {(
            [
              { key: 'all', label: 'Semua' },
              { key: 'bank', label: 'Bank' },
              { key: 'ewallet', label: 'E-Wallet' },
              { key: 'cash', label: 'Tunai' }
            ] as const
          ).map((tab) => {
            const active = categoryFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategoryFilter(tab.key)}
                className={`min-h-[40px] shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                  active
                    ? 'bg-[#EAECEF] font-bold text-[#111827]'
                    : 'bg-transparent font-medium text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={openAddSheet}
          aria-label="Tambah rekening baru"
          className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-[#111827] hover:bg-[#EAECEF]"
        >
          <IconPlus className="w-5 h-5" />
        </button>
      </div>

      {/* Kartu Ringkasan "Aset Saya" */}
      <section
        aria-label="Total Aset Saya"
        className="rounded-2xl bg-white px-4 py-3 shadow-xs border border-[#ECEFF4]"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[15px] font-medium text-[#111827] whitespace-nowrap">
              Aset Saya
            </span>
            <button
              type="button"
              onClick={() => setShowMonthlyInfo((v) => !v)}
              aria-label="Lihat rincian pemasukan dan pengeluaran bulan ini"
              aria-expanded={showMonthlyInfo}
              className="inline-flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-[#7B1FA2] text-[11px] font-bold text-white"
            >
              i
            </button>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[15px] font-bold text-[#0B1220] tnum truncate">
              {formatBalanceText(totalBalance)}
            </span>
            <button
              type="button"
              onClick={() => setHideBalances((v) => !v)}
              aria-label={hideBalances ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
              className="inline-flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-lg text-[#0B1220] hover:bg-[#F3F4F6]"
            >
              {hideBalances ? (
                <IconEyeOff className="w-5 h-5" />
              ) : (
                <IconEye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {(showMonthlyInfo || hasSimulation) && (
          <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold tnum">
            {hasSimulation && (
              <span className="rounded bg-[#F3F4F6] px-1.5 py-0.5 text-[10px] font-bold text-[#4B5563]">
                [SIMULASI SALDO]
              </span>
            )}
            {showMonthlyInfo && (
              <>
                <span className="text-[#0D6848]">
                  Masuk bln ini: {hideBalances ? 'Rp••••' : formatRupiah(monthIncome, true)}
                </span>
                <span className="text-[#9F1D2C]">
                  Keluar: {hideBalances ? 'Rp••••' : formatRupiah(-monthExpense)}
                </span>
              </>
            )}
          </div>
        )}
      </section>

      {/* Grid 2 Kolom Kartu Rekening */}
      {accounts.length === 0 ? (
        <div className="rounded-2xl bg-white p-5 border border-[#ECEFF4] space-y-3">
          <h2 className="text-sm font-bold text-[#0B1220]">Belum Ada Rekening Tercatat</h2>
          <p className="text-xs leading-relaxed text-[#475569]">
            Tambahkan minimal satu rekening (misalnya Kantong Utama, BCA, GoPay, atau Kas Tunai) untuk mulai mencatat pemasukan dan pengeluaran, atau sambungkan ke Google Sheet pribadi Anda.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={openAddSheet}
              className="w-full min-h-[46px] rounded-xl bg-[#0F4C81] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#09355C]"
            >
              + Buat Rekening Pertama Saya
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-full min-h-[44px] rounded-xl border border-[#0B1220] bg-white px-4 py-2.5 text-xs font-bold text-[#0B1220] hover:bg-[#F8FAFC]"
            >
              Hubungkan ke Google Sheet Pribadi
            </button>
            <button
              type="button"
              onClick={onLoadSimulation}
              className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#E2E8F0]"
            >
              Lihat Contoh dengan Data Uji Coba [SIMULASI SALDO]
            </button>
          </div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="rounded-2xl bg-white p-5 border border-[#ECEFF4] text-center space-y-2">
          <p className="text-xs font-medium text-[#475569]">
            Tidak ada rekening yang cocok dengan pencarian &quot;{searchQuery}&quot;.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
            }}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-[#F3F4F6] px-4 text-xs font-bold text-[#111827]"
          >
            Tampilkan Semua Rekening
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5">
          {filteredAccounts.map((acc, idx) => {
            const { theme, emblem } = resolveAccountVisual(acc, idx, visualMap);
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  setSelectedAccountId(acc.id);
                }}
                className={`group relative flex min-h-[164px] flex-col justify-between rounded-2xl border p-3.5 text-left shadow-xs transition-transform active:scale-[0.98] ${theme.bgClass} ${theme.borderClass}`}
              >
                <div>
                  <AccountCardEmblem kind={emblem} isDarkBg={theme.isDark} />
                </div>

                <div className="mt-4 pr-5 space-y-0.5">
                  <h3 className={`text-[15px] font-medium leading-snug line-clamp-2 ${theme.titleClass}`}>
                    {acc.name}
                  </h3>
                  <p
                    className={`text-[15px] font-bold tnum ${
                      acc.balance < 0
                        ? theme.isDark
                          ? 'text-[#FECACA]'
                          : 'text-[#9F1D2C]'
                        : theme.amountClass
                    }`}
                  >
                    {formatBalanceText(acc.balance)}
                  </p>
                  <p className={`text-[11px] font-medium truncate ${theme.subClass}`}>
                    {acc.roleTag || acc.maskedNumber}
                  </p>
                </div>

                {acc.type !== 'ewallet' && (
                  <span
                    className={`pointer-events-none absolute right-2.5 bottom-3 ${theme.watermarkClass}`}
                  >
                    <IconCardWatermark className="w-7 h-8" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Modal Tambah Rekening Baru */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#0B1220]/60 p-0 md:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-acc-modal-title"
        >
          <div className="w-full md:max-w-[430px] max-h-[92dvh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-white p-5 border border-[#DCE2EC] shadow-xl space-y-3.5">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#DCE2EC]">
              <h2 id="add-acc-modal-title" className="text-base font-bold text-[#0B1220]">
                Tambah Rekening / Kantong Baru
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Tutup form tambah rekening"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#DCE2EC] text-[#0B1220]"
              >
                <IconClose />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3">
              {formError && (
                <p
                  role="alert"
                  className="rounded-lg bg-[#FEF2F2] p-2.5 text-xs font-semibold text-[#9F1D2C]"
                >
                  {formError}
                </p>
              )}

              <div>
                <label htmlFor="acc-name" className="block text-xs font-bold text-[#0B1220] mb-1">
                  Nama Rekening / Kantong
                </label>
                <input
                  id="acc-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kantong Utama, Tabungan, GoPay"
                  className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0B1220]"
                  required
                />
              </div>

              <div>
                <span className="block text-xs font-bold text-[#0B1220] mb-1">
                  Kategori Rekening
                </span>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Jenis rekening">
                  {(
                    [
                      { key: 'bank', label: 'Bank' },
                      { key: 'ewallet', label: 'E-Wallet' },
                      { key: 'cash', label: 'Tunai' }
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setType(opt.key);
                        if (opt.key === 'ewallet') {
                          setPickedColor('cyan');
                          setPickedEmblem('ewallet');
                        } else if (opt.key === 'cash') {
                          setPickedEmblem('card');
                        }
                      }}
                      aria-pressed={type === opt.key}
                      className={`min-h-[44px] rounded-xl border text-xs font-bold ${
                        type === opt.key
                          ? 'border-[#0F4C81] bg-[#0F4C81] text-white'
                          : 'border-[#CBD5E1] bg-white text-[#0B1220] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="acc-mask" className="block text-xs font-bold text-[#0B1220] mb-1">
                    Info Nomor (Opsional)
                  </label>
                  <input
                    id="acc-mask"
                    type="text"
                    value={maskedNumber}
                    onChange={(e) => setMaskedNumber(e.target.value)}
                    placeholder="Contoh: •••• 4821"
                    className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0B1220]"
                  />
                </div>
                <div>
                  <label htmlFor="acc-role" className="block text-xs font-bold text-[#0B1220] mb-1">
                    Label Keterangan
                  </label>
                  <input
                    id="acc-role"
                    type="text"
                    value={roleTag}
                    onChange={(e) => setRoleTag(e.target.value)}
                    placeholder="Kantong Utama / Harian"
                    className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0B1220]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="acc-init" className="block text-xs font-bold text-[#0B1220] mb-1">
                  Saldo Awal Saat Ini (Rp)
                </label>
                <input
                  id="acc-init"
                  type="text"
                  inputMode="numeric"
                  value={initialBalanceRaw}
                  onChange={(e) => {
                    const num = parseDigitsToNumber(e.target.value);
                    setInitialBalanceRaw(
                      num > 0 ? formatNumberInput(num) : e.target.value === '0' ? '0' : ''
                    );
                  }}
                  placeholder="0"
                  className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-base font-bold text-[#0B1220] tnum"
                />
              </div>

              {/* Pemilih Warna & Ikon Kartu */}
              <div className="space-y-2 pt-1">
                <span className="block text-xs font-bold text-[#0B1220]">
                  Warna & Ikon Kartu
                </span>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {Object.values(ACCOUNT_CARD_THEMES).map((th) => (
                      <button
                        key={th.key}
                        type="button"
                        onClick={() => setPickedColor(th.key)}
                        aria-label={`Pilih warna ${th.label}`}
                        style={{ backgroundColor: th.swatchHex }}
                        className={`h-8 w-8 rounded-full border-2 ${
                          pickedColor === th.key
                            ? 'border-[#0B1220] scale-110'
                            : 'border-[#CBD5E1]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: 'bag', label: 'Kantong Uang' },
                      { key: 'card', label: 'Kartu Bank' },
                      { key: 'ewallet', label: 'Dompet Digital' }
                    ] as const
                  ).map((em) => (
                    <button
                      key={em.key}
                      type="button"
                      onClick={() => setPickedEmblem(em.key)}
                      className={`min-h-[40px] rounded-xl border text-xs font-semibold ${
                        pickedEmblem === em.key
                          ? 'border-[#0F4C81] bg-[#EFF6FF] text-[#0F4C81]'
                          : 'border-[#CBD5E1] bg-white text-[#475569]'
                      }`}
                    >
                      {em.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full min-h-[48px] rounded-xl bg-[#0F4C81] px-4 py-3 text-sm font-bold text-white hover:bg-[#09355C] disabled:bg-[#CBD5E1] disabled:text-[#475569]"
              >
                {isBusy ? 'Menyimpan Rekening...' : 'Simpan Rekening Baru'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail & Aksi Rekening saat Kartu Diklik */}
      {selectedAccount && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#0B1220]/60 p-0 md:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-acc-title"
        >
          {(() => {
            const { theme, emblem } = resolveAccountVisual(
              selectedAccount,
              Math.max(0, selectedAccountIndex),
              visualMap
            );
            return (
              <div className="w-full md:max-w-[430px] max-h-[92dvh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-white p-5 border border-[#DCE2EC] shadow-xl space-y-4">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#DCE2EC]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${theme.bgClass} ${theme.borderClass}`}
                    >
                      <div className="scale-75">
                        <AccountCardEmblem kind={emblem} isDarkBg={theme.isDark} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h2 id="detail-acc-title" className="text-base font-bold text-[#0B1220] truncate">
                        {selectedAccount.name}
                      </h2>
                      <p className="text-xs text-[#475569] truncate">
                        {selectedAccount.roleTag} • {selectedAccount.maskedNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAccountId(null)}
                    aria-label="Tutup detail rekening"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#DCE2EC] text-[#0B1220]"
                  >
                    <IconClose />
                  </button>
                </div>

                <div className="rounded-xl bg-[#F8FAFC] border border-[#DCE2EC] p-3.5 flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-[#475569]">Saldo Saat Ini</span>
                  <span className="text-xl font-bold text-[#0B1220] tnum">
                    {formatRupiah(selectedAccount.balance)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedAccount.id;
                      setSelectedAccountId(null);
                      onQuickRecordForAccount(id);
                    }}
                    className="w-full min-h-[46px] rounded-xl bg-[#0F4C81] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#09355C]"
                  >
                    Catat Pemasukan / Pengeluaran di Rekening Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedAccount.id;
                      setSelectedAccountId(null);
                      onQuickTransferFromAccount(id);
                    }}
                    className="w-full min-h-[44px] rounded-xl border border-[#0B1220] bg-white px-4 py-2.5 text-xs font-bold text-[#0B1220] hover:bg-[#F8FAFC]"
                  >
                    Pindah Saldo dari Rekening Ini
                  </button>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] space-y-2">
                  <span className="block text-xs font-bold text-[#0B1220]">
                    Ubah Warna & Ikon Kartu
                  </span>
                  <div className="flex items-center gap-2">
                    {Object.values(ACCOUNT_CARD_THEMES).map((th) => (
                      <button
                        key={th.key}
                        type="button"
                        onClick={() =>
                          handleUpdateAccountVisual(selectedAccount.id, { colorTheme: th.key })
                        }
                        aria-label={`Ubah warna kartu ke ${th.label}`}
                        style={{ backgroundColor: th.swatchHex }}
                        className={`h-8 w-8 rounded-full border-2 ${
                          theme.key === th.key ? 'border-[#0B1220] scale-110' : 'border-[#CBD5E1]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { key: 'bag', label: 'Kantong' },
                        { key: 'card', label: 'Kartu' },
                        { key: 'ewallet', label: 'E-Wallet' }
                      ] as const
                    ).map((em) => (
                      <button
                        key={em.key}
                        type="button"
                        onClick={() =>
                          handleUpdateAccountVisual(selectedAccount.id, { emblem: em.key })
                        }
                        className={`min-h-[38px] rounded-xl border text-xs font-semibold ${
                          emblem === em.key
                            ? 'border-[#0F4C81] bg-[#EFF6FF] text-[#0F4C81]'
                            : 'border-[#CBD5E1] bg-white text-[#475569]'
                        }`}
                      >
                        {em.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9]">
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="w-full min-h-[44px] rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-xs font-bold text-[#9F1D2C]"
                    >
                      Hapus Rekening Ini
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={async () => {
                          await onDeleteAccount(selectedAccount.id);
                          setConfirmDelete(false);
                          setSelectedAccountId(null);
                        }}
                        className="flex-1 min-h-[44px] rounded-xl bg-[#9F1D2C] px-3 py-2 text-xs font-bold text-white"
                      >
                        Ya, Hapus Rekening
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="min-h-[44px] rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-bold text-[#0B1220]"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function defaultRoleForType(type: AccountType): string {
  if (type === 'bank') return 'Rekening Bank';
  if (type === 'ewallet') return 'Dompet Digital';
  return 'Kas Harian';
}
