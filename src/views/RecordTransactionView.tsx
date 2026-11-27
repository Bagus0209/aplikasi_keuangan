import React, { useEffect, useRef, useState } from 'react';
import { IconCamera } from '../components/Icons';
import { compressReceiptImage, type CompressedReceipt } from '../lib/imageCompressor';
import {
  formatNumberInput,
  formatRupiah,
  getNowTime,
  getTodayIso,
  parseDigitsToNumber
} from '../lib/format';
import { previewTransactionBalance, type NewTransactionInput } from '../lib/ledger';
import { getCategoriesForKind, previewBudgetImpact } from '../lib/preferences';
import type { Account, Transaction, TransactionKind, UserPreferences } from '../lib/types';

interface RecordTransactionViewProps {
  accounts: Account[];
  transactions: Transaction[];
  preferences: UserPreferences;
  preselectedAccountId?: string;
  isBusy: boolean;
  onSaveTransaction: (
    input: NewTransactionInput,
    receiptBase64?: string
  ) => Promise<void>;
  onAddCustomCategory: (kind: TransactionKind, name: string) => void;
  onOpenBudgetManager: () => void;
  onGoToAddAccount: () => void;
  onPreviewReceipt: (url: string, caption: string) => void;
}

export function RecordTransactionView({
  accounts,
  transactions,
  preferences,
  preselectedAccountId,
  isBusy,
  onSaveTransaction,
  onAddCustomCategory,
  onOpenBudgetManager,
  onGoToAddAccount,
  onPreviewReceipt
}: RecordTransactionViewProps): React.ReactElement {
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [accountId, setAccountId] = useState<string>(
    preselectedAccountId || accounts[0]?.id || ''
  );
  const [amountRaw, setAmountRaw] = useState('');
  const [category, setCategory] = useState(() => getCategoriesForKind(preferences, 'expense')[0]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getTodayIso());
  const [time, setTime] = useState(getNowTime());

  const [showAddCat, setShowAddCat] = useState(false);
  const [customCatDraft, setCustomCatDraft] = useState('');
  const [customCatErr, setCustomCatErr] = useState<string | null>(null);

  const [receipt, setReceipt] = useState<CompressedReceipt | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories = getCategoriesForKind(preferences, kind);

  useEffect(() => {
    if (preselectedAccountId && accounts.some((a) => a.id === preselectedAccountId)) {
      setAccountId(preselectedAccountId);
    } else if (!accounts.some((a) => a.id === accountId) && accounts[0]) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, preselectedAccountId, accountId]);

  useEffect(() => {
    if (!categories.includes(category) && categories[0]) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  const handleSwitchKind = (next: TransactionKind) => {
    setKind(next);
    const nextList = getCategoriesForKind(preferences, next);
    setCategory(nextList[0] || 'Lainnya');
    setShowAddCat(false);
    setCustomCatErr(null);
    setSuccessMsg(null);
  };

  const handleQuickAddCategory = () => {
    const clean = customCatDraft.trim();
    if (!clean) {
      setCustomCatErr('Masukkan nama kategori baru.');
      return;
    }
    try {
      onAddCustomCategory(kind, clean);
      setCategory(clean);
      setCustomCatDraft('');
      setCustomCatErr(null);
      setShowAddCat(false);
    } catch (err) {
      setCustomCatErr(err instanceof Error ? err.message : 'Gagal menambah kategori.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setIsCompressing(true);
    try {
      const compressed = await compressReceiptImage(file);
      setReceipt(compressed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses gambar struk.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 border border-[#DCE2EC] space-y-3">
        <h2 className="text-base font-bold text-[#0B1220]">Rekening Tujuan Belum Tersedia</h2>
        <p className="text-xs leading-relaxed text-[#475569]">
          Buat minimal satu rekening terlebih dahulu agar setiap pemasukan dan pengeluaran dapat langsung menambah atau mengurangi saldo rekening Anda.
        </p>
        <button
          type="button"
          onClick={onGoToAddAccount}
          className="w-full min-h-[46px] rounded-xl bg-[#0F4C81] px-4 py-2.5 text-xs font-bold text-white"
        >
          Buka Menu Rekening & Buat Rekening
        </button>
      </div>
    );
  }

  const selectedAccount = accounts.find((a) => a.id === accountId) || accounts[0];
  const numericAmount = parseDigitsToNumber(amountRaw);
  const preview = previewTransactionBalance(selectedAccount, kind, numericAmount);

  const budgetImpact =
    kind === 'expense' && date.length >= 7
      ? previewBudgetImpact(transactions, preferences, category, date.slice(0, 7), numericAmount)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (numericAmount <= 0) {
      setErrorMsg('Masukkan nominal transaksi lebih dari Rp 0.');
      return;
    }

    try {
      await onSaveTransaction(
        {
          date,
          time,
          kind,
          amount: numericAmount,
          category,
          note,
          accountId: selectedAccount.id,
          receiptPreviewDataUrl: receipt?.dataUrl,
          receiptFileName: receipt?.fileName
        },
        receipt?.dataUrl
      );
      setAmountRaw('');
      setNote('');
      setReceipt(null);
      setTime(getNowTime());
      setSuccessMsg(
        `Transaksi tersimpan. Saldo ${selectedAccount.name} menjadi ${formatRupiah(preview.balanceAfter)}.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan transaksi.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-base font-bold text-[#0B1220]">Catat & Konversi ke Rekening</h2>

      {/* Pengalih Pengeluaran / Pemasukan */}
      <div
        className="grid grid-cols-2 gap-1.5 rounded-xl bg-white p-1 border border-[#DCE2EC]"
        role="radiogroup"
        aria-label="Jenis transaksi"
      >
        <button
          type="button"
          onClick={() => handleSwitchKind('expense')}
          aria-pressed={kind === 'expense'}
          className={`min-h-[44px] rounded-lg text-xs font-bold transition-colors ${
            kind === 'expense'
              ? 'bg-[#9F1D2C] text-white'
              : 'bg-[#FEF2F2] text-[#9F1D2C] hover:bg-[#FEE2E2]'
          }`}
        >
          Pengeluaran (-)
        </button>
        <button
          type="button"
          onClick={() => handleSwitchKind('income')}
          aria-pressed={kind === 'income'}
          className={`min-h-[44px] rounded-lg text-xs font-bold transition-colors ${
            kind === 'income'
              ? 'bg-[#0D6848] text-white'
              : 'bg-[#ECFDF5] text-[#0D6848] hover:bg-[#D1FAE5]'
          }`}
        >
          Pemasukan (+)
        </button>
      </div>

      {errorMsg && (
        <div role="alert" className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-3 text-xs font-semibold text-[#9F1D2C]">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div role="status" className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-3 text-xs font-semibold text-[#0D6848]">
          {successMsg}
        </div>
      )}

      {/* Zona Upload Gambar Bukti / Struk */}
      <section className="rounded-2xl border-2 border-dashed border-[#0F4C81] bg-white p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-[#0B1220]">
            Bukti Gambar / Foto Struk {receipt ? '(Terlampir)' : '(Opsional)'}
          </span>
          {receipt && (
            <span className="text-[11px] font-semibold text-[#0D6848] tnum">
              {Math.max(1, Math.round(receipt.sizeBytes / 1024))} KB JPEG
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          id="receipt-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="sr-only"
        />

        {isCompressing ? (
          <div className="rounded-xl bg-[#F8FAFC] p-3 text-xs font-medium text-[#475569]">
            Sedang mengompresi foto struk agar ringan dikirim ke Google Drive...
          </div>
        ) : !receipt ? (
          <label
            htmlFor="receipt-upload"
            className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] px-3 py-2.5 text-xs font-bold text-[#0F4C81] hover:bg-[#EFF6FF]"
          >
            <IconCamera className="w-5 h-5" />
            <span>Ambil Foto Kamera / Pilih Gambar Struk</span>
          </label>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] p-2.5">
            <button
              type="button"
              onClick={() => onPreviewReceipt(receipt.dataUrl, receipt.fileName)}
              className="shrink-0 overflow-hidden rounded-lg border border-[#CBD5E1] bg-white"
              aria-label="Lihat perbesaran foto struk"
            >
              <img
                src={receipt.dataUrl}
                alt="Pratinjau lampiran foto struk"
                width={56}
                height={56}
                className="h-14 w-14 object-cover"
              />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-[#0B1220]">{receipt.fileName}</p>
              <p className="text-[11px] text-[#475569]">Ketuk gambar untuk memperbesar</p>
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="receipt-upload"
                className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-white border border-[#CBD5E1] px-2.5 text-[11px] font-bold text-[#0F4C81]"
              >
                Ganti
              </label>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-[#FEF2F2] px-2.5 text-[11px] font-bold text-[#9F1D2C]"
              >
                Hapus
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Kartu Input Nominal, Kategori, Tanggal & Catatan */}
      <section className="rounded-2xl bg-white p-4 border border-[#DCE2EC] space-y-3">
        <div>
          <label htmlFor="tx-amount" className="block text-xs font-bold text-[#475569] mb-1">
            Nominal {kind === 'expense' ? 'Pengeluaran (Mengurangi Saldo)' : 'Pemasukan (Menambah Saldo)'}
          </label>
          <div className="flex items-center rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3.5">
            <span
              className={`shrink-0 whitespace-nowrap pr-2 text-lg font-bold ${
                kind === 'expense' ? 'text-[#9F1D2C]' : 'text-[#0D6848]'
              }`}
            >
              {kind === 'expense' ? '- Rp' : '+ Rp'}
            </span>
            <input
              id="tx-amount"
              type="text"
              inputMode="numeric"
              value={amountRaw}
              onChange={(e) => {
                const n = parseDigitsToNumber(e.target.value);
                setAmountRaw(n > 0 ? formatNumberInput(n) : '');
              }}
              placeholder="0"
              className={`w-full min-w-0 min-h-[48px] bg-transparent py-2 text-2xl font-bold tnum focus:outline-none ${
                kind === 'expense' ? 'text-[#9F1D2C]' : 'text-[#0D6848]'
              }`}
              required
            />
          </div>
        </div>

        <div className="pt-2 border-t border-[#F1F5F9] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="tx-category" className="text-xs font-bold text-[#0B1220]">
              Kategori
            </label>
            <button
              type="button"
              onClick={() => {
                setShowAddCat((v) => !v);
                setCustomCatErr(null);
              }}
              className="text-[11px] font-bold text-[#0F4C81] hover:underline"
            >
              {showAddCat ? 'Tutup' : '+ Kategori Kustom'}
            </button>
          </div>
          <select
            id="tx-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#0B1220]"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {showAddCat && (
            <div className="rounded-xl bg-[#F8FAFC] border border-[#DCE2EC] p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label="Nama kategori kustom baru"
                  value={customCatDraft}
                  onChange={(e) => setCustomCatDraft(e.target.value)}
                  placeholder="Nama kategori baru..."
                  className="flex-1 min-h-[40px] rounded-lg border border-[#CBD5E1] bg-white px-2.5 text-xs text-[#0B1220]"
                />
                <button
                  type="button"
                  onClick={handleQuickAddCategory}
                  className="min-h-[40px] shrink-0 rounded-lg bg-[#0F4C81] px-3 text-xs font-bold text-white"
                >
                  Simpan
                </button>
              </div>
              {customCatErr && (
                <p role="alert" className="text-[11px] font-semibold text-[#9F1D2C]">
                  {customCatErr}
                </p>
              )}
            </div>
          )}

          {/* Indikator Anggaran Bulanan Real-Time untuk kategori terpilih */}
          {budgetImpact && (
            <div
              className={`rounded-xl border p-2.5 text-xs space-y-1.5 ${
                budgetImpact.status === 'exceeded'
                  ? 'bg-[#FEF2F2] border-[#FECACA] text-[#9F1D2C]'
                  : budgetImpact.status === 'warning'
                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                    : 'bg-[#F8FAFC] border-[#DCE2EC] text-[#475569]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">
                  Anggaran {budgetImpact.category} ({budgetImpact.percent}%)
                </span>
                <button
                  type="button"
                  onClick={onOpenBudgetManager}
                  className="text-[11px] font-bold underline shrink-0"
                >
                  Atur
                </button>
              </div>
              <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, budgetImpact.percent)}%` }}
                  className={`h-full rounded-full ${
                    budgetImpact.status === 'exceeded'
                      ? 'bg-[#9F1D2C]'
                      : budgetImpact.status === 'warning'
                        ? 'bg-[#D97706]'
                        : 'bg-[#0D6848]'
                  }`}
                />
              </div>
              <p className="text-[11px] tnum">
                {budgetImpact.status === 'exceeded'
                  ? `Melebihi batas ${formatRupiah(budgetImpact.limit)} sebesar ${formatRupiah(Math.abs(budgetImpact.remaining))}.`
                  : `Terpakai ${formatRupiah(budgetImpact.spent)} dari ${formatRupiah(budgetImpact.limit)} (sisa ${formatRupiah(budgetImpact.remaining)}).`}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="tx-date" className="block text-xs font-bold text-[#0B1220] mb-1">
              Tanggal
            </label>
            <input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-w-0 min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 text-xs font-semibold text-[#0B1220] tnum"
              required
            />
          </div>
          <div>
            <label htmlFor="tx-time" className="block text-xs font-bold text-[#0B1220] mb-1">
              Jam
            </label>
            <input
              id="tx-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full min-w-0 min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 text-xs font-semibold text-[#0B1220] tnum"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="tx-note" className="block text-xs font-bold text-[#0B1220] mb-1">
            Catatan Keterangan
          </label>
          <input
            id="tx-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: Makan siang rapat atau pelunasan invoice"
            className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0B1220]"
          />
        </div>
      </section>

      {/* Kotak Konversi Saldo Rekening Langsung */}
      <section className="rounded-2xl bg-white p-4 border-2 border-[#0F4C81] space-y-2.5">
        <div>
          <label htmlFor="tx-account" className="block text-xs font-bold text-[#0F4C81] mb-1">
            Konversi Saldo ke Rekening
          </label>
          <select
            id="tx-account"
            value={selectedAccount.id}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full min-h-[46px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm font-bold text-[#0B1220]"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({formatRupiah(acc.balance)})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 pt-1 text-xs tnum">
          <div className="flex items-center justify-between text-[#475569]">
            <span>Saldo Awal Rekening</span>
            <span className="font-semibold text-[#0B1220]">
              {formatRupiah(preview.balanceBefore)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[#475569]">
            <span>Perubahan ({kind === 'expense' ? 'Pengeluaran' : 'Pemasukan'})</span>
            <span
              className={`font-bold ${
                kind === 'expense' ? 'text-[#9F1D2C]' : 'text-[#0D6848]'
              }`}
            >
              {formatRupiah(preview.delta, true)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#F1F5F9] px-3 py-2.5 font-bold text-[#0B1220]">
            <span>Saldo Akhir {selectedAccount.name}</span>
            <span className={`text-sm ${preview.balanceAfter < 0 ? 'text-[#9F1D2C]' : ''}`}>
              {formatRupiah(preview.balanceAfter)}
            </span>
          </div>
          {preview.warning && (
            <p className="text-[11px] font-semibold text-[#9F1D2C]">{preview.warning}</p>
          )}
        </div>
      </section>

      <button
        type="submit"
        disabled={isBusy || isCompressing}
        className="w-full min-h-[50px] rounded-xl bg-[#0F4C81] px-4 py-3 text-sm font-bold text-white hover:bg-[#09355C] active:bg-[#072846] disabled:bg-[#CBD5E1] disabled:text-[#475569]"
      >
        {isBusy
          ? 'Menyimpan & Mengunggah ke Google Sheet...'
          : kind === 'expense'
            ? `Simpan & Kurangi Saldo ${selectedAccount.name}`
            : `Simpan & Tambah Saldo ${selectedAccount.name}`}
      </button>
    </form>
  );
}
