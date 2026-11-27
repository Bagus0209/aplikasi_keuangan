import React, { useState } from 'react';
import { IconEdit, IconFilter, IconSearch, IconTarget } from '../components/Icons';
import {
  formatRupiah,
  formatRupiahCompact,
  formatTanggalIndo,
  getTodayIso,
  shiftIsoDate
} from '../lib/format';
import { computePeriodAnalytics, filterTransactions } from '../lib/ledger';
import { computeMonthlyBudgetStatuses, getAllKnownCategories } from '../lib/preferences';
import type {
  Account,
  PeriodFilter,
  Transaction,
  TransactionKind,
  UserPreferences
} from '../lib/types';

interface AnalyticsViewProps {
  accounts: Account[];
  transactions: Transaction[];
  preferences: UserPreferences;
  isBusy: boolean;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => Promise<void>;
  onOpenBudgetModal: (section: 'budgets' | 'categories') => void;
  onPreviewReceipt: (url: string, caption: string) => void;
  onGoToRecord: () => void;
}

export function AnalyticsView({
  accounts,
  transactions,
  preferences,
  isBusy,
  onEditTransaction,
  onDeleteTransaction,
  onOpenBudgetModal,
  onPreviewReceipt,
  onGoToRecord
}: AnalyticsViewProps): React.ReactElement {
  const [period, setPeriod] = useState<PeriodFilter>('weekly');
  const [anchorDate, setAnchorDate] = useState<string>(getTodayIso());
  const [accountFilter, setAccountFilter] = useState<string>('all');

  // Pencarian & filter riwayat transaksi
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [kindFilter, setKindFilter] = useState<'all' | TransactionKind>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchAllDates, setSearchAllDates] = useState(false);

  // Konfirmasi hapus transaksi 2 langkah
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);

  const analytics = computePeriodAnalytics(transactions, period, anchorDate, accountFilter);
  const maxBarValue = Math.max(
    1,
    ...analytics.buckets.flatMap((b) => [b.income, b.expense])
  );
  const stepDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;

  const monthPrefix = anchorDate.slice(0, 7);
  const budgetStatuses = computeMonthlyBudgetStatuses(transactions, preferences, monthPrefix);
  const allCategories = getAllKnownCategories(preferences, transactions);

  const hasCustomSearchOrFilter = Boolean(
    searchQuery.trim() ||
      kindFilter !== 'all' ||
      categoryFilter !== 'all' ||
      dateFrom ||
      dateTo ||
      searchAllDates
  );

  const activeFilterCount =
    (kindFilter !== 'all' ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (searchAllDates ? 1 : 0);

  // Jika pengguna mengetik kata kunci atau mengisi rentang tanggal, cari di seluruh riwayat transaksi
  const searchSource =
    searchAllDates || searchQuery.trim() || dateFrom || dateTo
      ? transactions
      : analytics.filteredTransactions;

  const searchResult = filterTransactions(searchSource, {
    query: searchQuery,
    kind: kindFilter,
    category: categoryFilter,
    accountId: accountFilter,
    dateFrom,
    dateTo
  });

  const displayedTransactions = hasCustomSearchOrFilter
    ? searchResult.items
    : analytics.filteredTransactions;

  const resetHistoryFilters = () => {
    setSearchQuery('');
    setKindFilter('all');
    setCategoryFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchAllDates(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[#0B1220]">Analitik, Anggaran & Riwayat</h2>
      </div>

      {/* Pengalih Periode */}
      <div
        className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1 border border-[#DCE2EC]"
        role="tablist"
        aria-label="Pilih rentang periode data"
      >
        {(
          [
            { key: 'daily', label: 'Harian' },
            { key: 'weekly', label: 'Mingguan' },
            { key: 'monthly', label: 'Bulanan' }
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={period === tab.key}
            onClick={() => setPeriod(tab.key)}
            className={`min-h-[44px] rounded-lg text-xs font-bold transition-colors ${
              period === tab.key
                ? 'bg-[#0F4C81] text-white'
                : 'bg-transparent text-[#475569] hover:bg-[#F3F5F8]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Navigasi Tanggal & Filter Rekening */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between rounded-xl bg-white border border-[#DCE2EC] px-1.5">
          <button
            type="button"
            onClick={() => setAnchorDate((d) => shiftIsoDate(d, -stepDays))}
            aria-label="Periode sebelumnya"
            className="min-h-[44px] min-w-[36px] text-sm font-bold text-[#0B1220] hover:bg-[#F3F5F8] rounded-lg"
          >
            &lt;
          </button>
          <span className="text-[11px] font-bold text-[#0B1220] text-center truncate px-1 tnum">
            {formatTanggalIndo(anchorDate, false)}
          </span>
          <button
            type="button"
            onClick={() => setAnchorDate((d) => shiftIsoDate(d, stepDays))}
            aria-label="Periode berikutnya"
            className="min-h-[44px] min-w-[36px] text-sm font-bold text-[#0B1220] hover:bg-[#F3F5F8] rounded-lg"
          >
            &gt;
          </button>
        </div>

        <div>
          <label htmlFor="analytics-acc-filter" className="sr-only">
            Filter rekening
          </label>
          <select
            id="analytics-acc-filter"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-[#DCE2EC] bg-white px-3 text-xs font-bold text-[#0B1220]"
          >
            <option value="all">Semua Rekening</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kartu Ringkasan Masuk vs Keluar */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-white p-3.5 border border-[#DCE2EC]">
          <p className="text-[11px] font-semibold text-[#475569]">Pemasukan Periode Ini</p>
          <p className="mt-1 text-base font-bold text-[#0D6848] tnum">
            {formatRupiah(analytics.totalIncome, true)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3.5 border border-[#DCE2EC]">
          <p className="text-[11px] font-semibold text-[#475569]">Pengeluaran Periode Ini</p>
          <p className="mt-1 text-base font-bold text-[#9F1D2C] tnum">
            {formatRupiah(-analytics.totalExpense)}
          </p>
        </div>
      </div>

      {/* Grafik Perbandingan */}
      <section className="rounded-2xl bg-white p-4 border border-[#DCE2EC] space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-bold text-[#0B1220]">
            Perbandingan masuk vs keluar ({analytics.periodLabel})
          </h3>
          <span className="text-[11px] font-bold text-[#0F4C81] tnum">
            Bersih: {formatRupiahCompact(analytics.netCashflow, true)}
          </span>
        </div>

        <div className="flex h-36 items-end justify-between gap-2 rounded-xl bg-[#F8FAFC] px-3 pt-4 pb-2.5 border border-[#EEF2F6]">
          {analytics.buckets.map((b) => {
            const inHeight = b.income > 0 ? Math.max(8, Math.round((b.income / maxBarValue) * 96)) : 3;
            const outHeight = b.expense > 0 ? Math.max(8, Math.round((b.expense / maxBarValue) * 96)) : 3;
            return (
              <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex items-end gap-1 h-24">
                  <div
                    title={`Masuk ${b.label}: ${formatRupiah(b.income)}`}
                    style={{ height: `${inHeight}px` }}
                    className={`w-2.5 rounded-t-sm ${
                      b.income > 0 ? 'bg-[#0D6848]' : 'bg-[#CBD5E1]'
                    }`}
                  />
                  <div
                    title={`Keluar ${b.label}: ${formatRupiah(b.expense)}`}
                    style={{ height: `${outHeight}px` }}
                    className={`w-2.5 rounded-t-sm ${
                      b.expense > 0 ? 'bg-[#9F1D2C]' : 'bg-[#CBD5E1]'
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] tnum ${
                    b.isCurrent ? 'font-bold text-[#0B1220]' : 'font-medium text-[#475569]'
                  }`}
                >
                  {b.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] font-medium text-[#475569]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#0D6848]" />
            Hijau: Pemasukan
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#9F1D2C]" />
            Merah: Pengeluaran
          </span>
        </div>
      </section>

      {/* Pantauan Anggaran Bulanan */}
      <section className="rounded-2xl bg-white p-4 border border-[#DCE2EC] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <IconTarget className="w-4 h-4 text-[#0F4C81] shrink-0" />
            <h3 className="text-xs font-bold text-[#0B1220] truncate">
              Anggaran Bulanan ({monthPrefix})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onOpenBudgetModal('budgets')}
            className="min-h-[36px] shrink-0 rounded-lg border border-[#0F4C81] bg-[#EFF6FF] px-2.5 text-[11px] font-bold text-[#0F4C81] hover:bg-[#DBEAFE]"
          >
            Atur Anggaran
          </button>
        </div>

        {budgetStatuses.length === 0 ? (
          <div className="rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] p-3.5 text-center space-y-2">
            <p className="text-xs text-[#475569]">
              Belum ada batas anggaran bulanan. Tetapkan batas per kategori agar Anda mendapat peringatan otomatis saat pengeluaran mendekati limit.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onOpenBudgetModal('budgets')}
                className="min-h-[40px] rounded-xl bg-[#0F4C81] px-3.5 text-xs font-bold text-white"
              >
                + Atur Anggaran
              </button>
              <button
                type="button"
                onClick={() => onOpenBudgetModal('categories')}
                className="min-h-[40px] rounded-xl border border-[#CBD5E1] bg-white px-3 text-xs font-bold text-[#0B1220]"
              >
                Kategori Kustom
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {budgetStatuses.map((item) => {
              const barColor =
                item.status === 'exceeded'
                  ? 'bg-[#9F1D2C]'
                  : item.status === 'warning'
                    ? 'bg-[#D97706]'
                    : 'bg-[#0D6848]';
              const badgeClass =
                item.status === 'exceeded'
                  ? 'bg-[#FEF2F2] text-[#9F1D2C] border-[#FECACA]'
                  : item.status === 'warning'
                    ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                    : 'bg-[#ECFDF5] text-[#0D6848] border-[#A7F3D0]';
              const badgeLabel =
                item.status === 'exceeded'
                  ? 'Melebihi Batas'
                  : item.status === 'warning'
                    ? 'Mendekati Batas'
                    : 'Aman';

              return (
                <div
                  key={item.category}
                  className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#0B1220] truncate">
                      {item.category}
                    </span>
                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold tnum ${badgeClass}`}
                    >
                      {badgeLabel} ({item.percent}%)
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, item.percent)}%` }}
                      className={`h-full rounded-full transition-all ${barColor}`}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] tnum">
                    <span className="text-[#475569]">
                      Terpakai <strong className="text-[#0B1220]">{formatRupiah(item.spent)}</strong> /{' '}
                      {formatRupiah(item.limit)}
                    </span>
                    <span
                      className={`font-bold ${
                        item.remaining < 0 ? 'text-[#9F1D2C]' : 'text-[#0D6848]'
                      }`}
                    >
                      {item.remaining < 0
                        ? `Lebih ${formatRupiah(Math.abs(item.remaining))}`
                        : `Sisa ${formatRupiah(item.remaining)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tabel Rekap Lintas Periode */}
      <section className="rounded-2xl bg-white p-4 border border-[#DCE2EC] space-y-2.5">
        <h3 className="text-xs font-bold text-[#0B1220]">
          Ringkasan Lintas Periode ({accountFilter === 'all' ? 'Semua Rekening' : 'Rekening Terpilih'})
        </h3>
        <div className="space-y-2 text-xs tnum">
          <div
            className={`flex items-center justify-between py-1 ${
              period === 'daily' ? 'font-bold text-[#0F4C81]' : 'text-[#475569]'
            }`}
          >
            <span>Harian ({anchorDate.slice(8, 10)}/{anchorDate.slice(5, 7)})</span>
            <span className="font-bold text-[#0B1220]">
              {formatRupiahCompact(analytics.crossPeriodRecap.daily.income, true)} /{' '}
              {formatRupiahCompact(-analytics.crossPeriodRecap.daily.expense)}
            </span>
          </div>
          <div
            className={`flex items-center justify-between py-1 border-t border-[#F1F5F9] ${
              period === 'weekly' ? 'font-bold text-[#0F4C81]' : 'text-[#475569]'
            }`}
          >
            <span>Mingguan</span>
            <span className="font-bold text-[#0B1220]">
              {formatRupiahCompact(analytics.crossPeriodRecap.weekly.income, true)} /{' '}
              {formatRupiahCompact(-analytics.crossPeriodRecap.weekly.expense)}
            </span>
          </div>
          <div
            className={`flex items-center justify-between py-1 border-t border-[#F1F5F9] ${
              period === 'monthly' ? 'font-bold text-[#0F4C81]' : 'text-[#475569]'
            }`}
          >
            <span>Bulanan ({anchorDate.slice(0, 7)})</span>
            <span className="font-bold text-[#0B1220]">
              {formatRupiahCompact(analytics.crossPeriodRecap.monthly.income, true)} /{' '}
              {formatRupiahCompact(-analytics.crossPeriodRecap.monthly.expense)}
            </span>
          </div>
        </div>
      </section>

      {/* Pencarian, Filter & Daftar Riwayat Transaksi */}
      <section className="rounded-2xl bg-white p-4 border border-[#DCE2EC] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-[#0B1220]">
            {hasCustomSearchOrFilter
              ? `Hasil Pencarian & Filter (${displayedTransactions.length})`
              : `Rincian Transaksi Periode (${displayedTransactions.length})`}
          </h3>
          {hasCustomSearchOrFilter && (
            <button
              type="button"
              onClick={resetHistoryFilters}
              className="text-[11px] font-bold text-[#9F1D2C] hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Bar Pencarian + Tombol Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center rounded-xl bg-[#F3F5F8] border border-[#DCE2EC] px-3">
            <IconSearch className="w-4 h-4 text-[#475569] shrink-0" />
            <input
              type="search"
              aria-label="Cari transaksi berdasarkan catatan, kategori, atau nominal"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari catatan, kategori, nominal..."
              className="w-full min-h-[44px] bg-transparent pl-2 pr-1 text-xs text-[#0B1220] placeholder:text-[#64748B] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-label="Tampilkan atau sembunyikan filter transaksi"
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold shrink-0 ${
              showFilters || activeFilterCount > 0
                ? 'border-[#0F4C81] bg-[#EFF6FF] text-[#0F4C81]'
                : 'border-[#DCE2EC] bg-white text-[#0B1220] hover:bg-[#F8FAFC]'
            }`}
          >
            <IconFilter className="w-4 h-4" />
            <span>Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
          </button>
        </div>

        {/* Panel Filter Lanjutan */}
        {showFilters && (
          <div className="rounded-xl bg-[#F8FAFC] border border-[#DCE2EC] p-3 space-y-2.5">
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Filter jenis transaksi">
              {(
                [
                  { key: 'all', label: 'Semua' },
                  { key: 'expense', label: 'Pengeluaran' },
                  { key: 'income', label: 'Pemasukan' }
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setKindFilter(opt.key)}
                  aria-pressed={kindFilter === opt.key}
                  className={`min-h-[38px] rounded-lg border text-[11px] font-bold ${
                    kindFilter === opt.key
                      ? 'border-[#0F4C81] bg-[#0F4C81] text-white'
                      : 'border-[#CBD5E1] bg-white text-[#475569]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="filter-tx-cat" className="block text-[11px] font-bold text-[#0B1220] mb-1">
                Kategori
              </label>
              <select
                id="filter-tx-cat"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full min-h-[40px] rounded-lg border border-[#CBD5E1] bg-white px-2.5 text-xs font-semibold text-[#0B1220]"
              >
                <option value="all">Semua Kategori</option>
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="filter-date-from" className="block text-[11px] font-bold text-[#0B1220] mb-1">
                  Dari Tanggal
                </label>
                <input
                  id="filter-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full min-h-[40px] rounded-lg border border-[#CBD5E1] bg-white px-2 text-xs text-[#0B1220] tnum"
                />
              </div>
              <div>
                <label htmlFor="filter-date-to" className="block text-[11px] font-bold text-[#0B1220] mb-1">
                  Sampai Tanggal
                </label>
                <input
                  id="filter-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full min-h-[40px] rounded-lg border border-[#CBD5E1] bg-white px-2 text-xs text-[#0B1220] tnum"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-[#0B1220] pt-0.5">
              <input
                type="checkbox"
                checked={searchAllDates || Boolean(searchQuery.trim() || dateFrom || dateTo)}
                disabled={Boolean(searchQuery.trim() || dateFrom || dateTo)}
                onChange={(e) => setSearchAllDates(e.target.checked)}
                className="h-4 w-4 rounded border-[#CBD5E1] accent-[#0F4C81]"
              />
              <span>Tampilkan dari seluruh tanggal (lintas bulan)</span>
            </label>
          </div>
        )}

        {/* Ringkasan Subtotal Filter Aktif */}
        {hasCustomSearchOrFilter && displayedTransactions.length > 0 && (
          <div className="rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-bold tnum">
            <span className="text-[#0D6848]">
              Masuk: {formatRupiahCompact(searchResult.totalIncome, true)}
            </span>
            <span className="text-[#9F1D2C]">
              Keluar: {formatRupiahCompact(-searchResult.totalExpense)}
            </span>
          </div>
        )}

        {displayedTransactions.length === 0 ? (
          <div className="py-4 text-center space-y-2.5">
            <p className="text-xs text-[#475569]">
              {hasCustomSearchOrFilter
                ? 'Tidak ada transaksi yang cocok dengan pencarian atau filter Anda.'
                : 'Belum ada catatan pemasukan atau pengeluaran pada periode ini.'}
            </p>
            {hasCustomSearchOrFilter ? (
              <button
                type="button"
                onClick={resetHistoryFilters}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-bold text-[#0B1220]"
              >
                Reset Pencarian & Filter
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoToRecord}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0F4C81] px-4 py-2 text-xs font-bold text-white"
              >
                + Catat Transaksi Sekarang
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {displayedTransactions.map((tx) => {
              const receiptSrc = tx.receiptPreviewDataUrl || tx.receiptUrl || '';
              const isConfirming = confirmDeleteTxId === tx.id;
              return (
                <div key={tx.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0B1220] truncate">
                        {tx.note || tx.category}
                      </p>
                      <p className="text-[11px] text-[#475569]">
                        {tx.date} {tx.time} • {tx.accountName} • {tx.category}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-bold tnum ${
                        tx.kind === 'income' ? 'text-[#0D6848]' : 'text-[#9F1D2C]'
                      }`}
                    >
                      {tx.kind === 'income'
                        ? formatRupiah(tx.amount, true)
                        : formatRupiah(-tx.amount)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {receiptSrc ? (
                      <button
                        type="button"
                        onClick={() => onPreviewReceipt(receiptSrc, tx.note || tx.category)}
                        className="inline-flex min-h-[36px] items-center rounded-lg bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-bold text-[#0F4C81]"
                      >
                        Foto Struk
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#64748B]">Tanpa lampiran foto</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {!isConfirming ? (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onEditTransaction(tx)}
                            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0F4C81] hover:bg-[#EFF6FF]"
                          >
                            <IconEdit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteTxId(tx.id)}
                            className="inline-flex min-h-[36px] items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold text-[#9F1D2C] hover:bg-[#FEF2F2]"
                          >
                            Hapus
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={async () => {
                              await onDeleteTransaction(tx.id);
                              setConfirmDeleteTxId(null);
                            }}
                            className="inline-flex min-h-[36px] items-center rounded-lg bg-[#9F1D2C] px-2.5 py-1 text-[11px] font-bold text-white"
                          >
                            Ya, Hapus & Kembalikan Saldo
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteTxId(null)}
                            className="inline-flex min-h-[36px] items-center rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0B1220]"
                          >
                            Batal
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
