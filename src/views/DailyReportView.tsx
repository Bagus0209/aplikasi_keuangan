import React, { useState } from 'react';
import {
  formatRupiah,
  formatTanggalIndo,
  getTodayIso,
  shiftIsoDate
} from '../lib/format';
import { computeDailyReport } from '../lib/ledger';
import {
  buildDailyShareText,
  exportDailyReportCsv,
  exportDailyReportPdf
} from '../lib/reportExporter';
import type { LedgerState, Transaction } from '../lib/types';

interface DailyReportViewProps {
  ledger: LedgerState;
  onEditTransaction: (tx: Transaction) => void;
  onPreviewReceipt: (url: string, caption: string) => void;
  onGoToRecord: () => void;
}

export function DailyReportView({
  ledger,
  onEditTransaction,
  onPreviewReceipt,
  onGoToRecord
}: DailyReportViewProps): React.ReactElement {
  const [reportDate, setReportDate] = useState<string>(getTodayIso());
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const report = computeDailyReport(ledger, reportDate);
  const hasSimulation =
    report.transactions.some((t) => t.isSimulation) ||
    report.transfers.some((tr) => tr.isSimulation);

  const handleShareOrCopy = async () => {
    const text = buildDailyShareText(report);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Laporan Keuangan Harian ${reportDate}`,
          text
        });
        return;
      } catch {
        // Lanjut ke salin teks jika dialog share dibatalkan
      }
    }
    await navigator.clipboard.writeText(text);
    setCopyFeedback('Ringkasan laporan harian berhasil disalin ke papan klip.');
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[#0B1220]">Laporan Harian</h2>
        <div className="flex items-center rounded-xl bg-white border border-[#CBD5E1] px-1">
          <button
            type="button"
            onClick={() => setReportDate((d) => shiftIsoDate(d, -1))}
            aria-label="Hari sebelumnya"
            className="min-h-[44px] min-w-[36px] text-sm font-bold text-[#0B1220] hover:bg-[#F3F5F8] rounded-lg"
          >
            &lt;
          </button>
          <input
            aria-label="Pilih tanggal laporan harian"
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="min-h-[44px] bg-transparent px-1.5 text-xs font-bold text-[#0B1220] tnum"
          />
          <button
            type="button"
            onClick={() => setReportDate((d) => shiftIsoDate(d, 1))}
            aria-label="Hari berikutnya"
            className="min-h-[44px] min-w-[36px] text-sm font-bold text-[#0B1220] hover:bg-[#F3F5F8] rounded-lg"
          >
            &gt;
          </button>
        </div>
      </div>

      {/* Kartu Ringkasan Eksekutif Harian */}
      <section className="rounded-2xl bg-[#0B1220] p-5 text-white space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs text-[#CBD5E1]">
          <span>Selisih Kas Bersih ({formatTanggalIndo(reportDate, true)})</span>
          {hasSimulation && (
            <span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white">
              [SIMULASI SALDO]
            </span>
          )}
        </div>
        <p className="text-2xl font-bold tnum">{formatRupiah(report.netChange, true)}</p>
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/15 text-xs font-bold tnum">
          <span className="text-[#6EE7B7]">Masuk: {formatRupiah(report.totalIncome, true)}</span>
          <span className="text-[#FCA5A5]">Keluar: {formatRupiah(-report.totalExpense)}</span>
        </div>
      </section>

      {copyFeedback && (
        <div role="status" className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-3 text-xs font-semibold text-[#0D6848]">
          {copyFeedback}
        </div>
      )}

      {/* Rincian Transaksi Harian */}
      <section className="rounded-2xl bg-white p-4 border border-[#DCE2EC] space-y-3">
        <h3 className="text-xs font-bold text-[#0B1220]">
          Rincian Pemasukan & Pengeluaran ({report.transactions.length})
        </h3>

        {report.transactions.length === 0 ? (
          <div className="py-4 text-center space-y-2.5">
            <p className="text-xs text-[#475569]">
              Tidak ada pemasukan atau pengeluaran yang tercatat pada tanggal {formatTanggalIndo(reportDate, false)}.
            </p>
            <button
              type="button"
              onClick={onGoToRecord}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0F4C81] px-4 py-2 text-xs font-bold text-white"
            >
              + Catat Transaksi untuk Tanggal Ini
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {report.transactions.map((tx) => {
              const receiptSrc = tx.receiptPreviewDataUrl || tx.receiptUrl || '';
              return (
                <div key={tx.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0B1220] truncate">
                      {tx.note || tx.category}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#475569]">
                      <span className="tnum">{tx.time}</span>
                      <span>•</span>
                      <span>{tx.accountName}</span>
                      {receiptSrc && (
                        <>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => onPreviewReceipt(receiptSrc, tx.note || tx.category)}
                            className="font-bold text-[#0F4C81] underline"
                          >
                            [Foto Bukti]
                          </button>
                        </>
                      )}
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => onEditTransaction(tx)}
                        className="font-bold text-[#0F4C81] hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-bold tnum ${
                      tx.kind === 'income' ? 'text-[#0D6848]' : 'text-[#9F1D2C]'
                    }`}
                  >
                    {tx.kind === 'income'
                      ? formatRupiah(tx.amount, true)
                      : formatRupiah(-tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Mutasi Antar Rekening pada Tanggal Ini */}
      {report.transfers.length > 0 && (
        <section className="rounded-2xl bg-white p-4 border border-[#DCE2EC] space-y-2">
          <h3 className="text-xs font-bold text-[#0B1220]">
            Mutasi Pindah Saldo Hari Ini ({report.transfers.length})
          </h3>
          <div className="divide-y divide-[#F1F5F9]">
            {report.transfers.map((tr) => (
              <div key={tr.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 text-[#475569] truncate">
                  {tr.time} • {tr.fromAccountName} {'->'} {tr.toAccountName}
                </span>
                <span className="shrink-0 whitespace-nowrap font-bold text-[#0F4C81] tnum">
                  {formatRupiah(tr.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Aksi Pembuatan & Ekspor Laporan Harian */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={() => void exportDailyReportPdf(report)}
          className="w-full min-h-[48px] rounded-xl bg-[#0F4C81] px-4 py-3 text-sm font-bold text-white hover:bg-[#09355C]"
        >
          Buat & Unduh Laporan Harian (PDF)
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => exportDailyReportCsv(report)}
            className="min-h-[44px] rounded-xl border border-[#0B1220] bg-white px-3 py-2 text-xs font-bold text-[#0B1220] hover:bg-[#F8FAFC]"
          >
            Ekspor CSV / Excel
          </button>
          <button
            type="button"
            onClick={handleShareOrCopy}
            className="min-h-[44px] rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-bold text-[#0F4C81] hover:bg-[#F8FAFC]"
          >
            Bagikan / Salin Teks
          </button>
        </div>
      </div>
    </div>
  );
}
