import React, { useState } from 'react';
import {
  formatRupiah,
  formatRupiahCompact,
  formatTanggalIndo,
  getTodayIso,
  shiftIsoDate
} from '../lib/format';
import { computePeriodAnalytics } from '../lib/ledger';
import type { Account, PeriodFilter, Transaction } from '../lib/types';

interface AnalyticsViewProps {
  accounts: Account[];
  transactions: Transaction[];
  isBusy: boolean;
  onDeleteTransaction: (txId: string) => Promise<void>;
  onPreviewReceipt: (url: string, caption: string) => void;
  onGoToRecord: () => void;
}

export function AnalyticsView({
  accounts,
  transactions,
  isBusy,
  onDeleteTransaction,
  onPreviewReceipt,
  onGoToRecord
}: AnalyticsViewProps): React.ReactElement {
  const [period, setPeriod] = useState<PeriodFilter>('weekly');
  const [anchorDate, setAnchorDate] = useState<string>(getTodayIso());
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const analytics = computePeriodAnalytics(transactions, period, anchorDate, accountFilter);
  const maxBarValue = Math.max(
    1,
    ...analytics.buckets.flatMap((b) => [b.income, b.expense])
  );

  const stepDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[#0B1220]">Data Harian, Mingguan & Bulanan</h2>
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

      {/* Tabel Rekap Lintas Periode (Harian, Mingguan, Bulanan sekaligus) */}
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

      {/* Daftar Riwayat Transaksi Periode Terpilih */}
      <section className="rounded-2xl bg-white p-4 border border-[#DCE2EC] space-y-3">
        <h3 className="text-xs font-bold text-[#0B1220]">
          Rincian Transaksi ({analytics.filteredTransactions.length})
        </h3>

        {analytics.filteredTransactions.length === 0 ? (
          <div className="py-4 text-center space-y-2.5">
            <p className="text-xs text-[#475569]">
              Belum ada catatan pemasukan atau pengeluaran pada periode ini.
            </p>
            <button
              type="button"
              onClick={onGoToRecord}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0F4C81] px-4 py-2 text-xs font-bold text-white"
            >
              + Catat Transaksi Sekarang
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {analytics.filteredTransactions.map((tx) => {
              const receiptSrc = tx.receiptPreviewDataUrl || tx.receiptUrl || '';
              return (
                <div key={tx.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
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

                  <div className="flex items-center justify-between gap-2">
                    {receiptSrc ? (
                      <button
                        type="button"
                        onClick={() => onPreviewReceipt(receiptSrc, tx.note || tx.category)}
                        className="inline-flex min-h-[36px] items-center rounded-lg bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-bold text-[#0F4C81]"
                      >
                        Lihat Foto Bukti Struk
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#64748B]">Tanpa lampiran foto</span>
                    )}

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="inline-flex min-h-[36px] items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold text-[#9F1D2C] hover:bg-[#FEF2F2]"
                    >
                      Batalkan & Kembalikan Saldo
                    </button>
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
