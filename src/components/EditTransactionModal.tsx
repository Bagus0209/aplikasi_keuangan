import React, { useEffect, useState } from 'react';
import { IconClose } from './Icons';
import { formatNumberInput, formatRupiah, parseDigitsToNumber } from '../lib/format';
import type { UpdateTransactionInput } from '../lib/ledger';
import { getCategoriesForKind, previewBudgetImpact } from '../lib/preferences';
import type { Account, Transaction, TransactionKind, UserPreferences } from '../lib/types';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  accounts: Account[];
  allTransactions: Transaction[];
  preferences: UserPreferences;
  isBusy: boolean;
  onClose: () => void;
  onSave: (input: UpdateTransactionInput) => Promise<void>;
}

export function EditTransactionModal({
  transaction,
  accounts,
  allTransactions,
  preferences,
  isBusy,
  onClose,
  onSave
}: EditTransactionModalProps): React.ReactElement | null {
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [amountRaw, setAmountRaw] = useState('');
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction) return;
    setKind(transaction.kind);
    setAmountRaw(formatNumberInput(transaction.amount));
    setAccountId(transaction.accountId);
    setCategory(transaction.category);
    setDate(transaction.date);
    setTime(transaction.time);
    setNote(transaction.note);
    setErrorMsg(null);
  }, [transaction]);

  useEffect(() => {
    if (!transaction) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [transaction, onClose]);

  if (!transaction) return null;

  const baseCategories = getCategoriesForKind(preferences, kind);
  const categories = baseCategories.includes(category)
    ? baseCategories
    : category
      ? [category, ...baseCategories]
      : baseCategories;

  const numericAmount = parseDigitsToNumber(amountRaw);
  const targetAccount = accounts.find((a) => a.id === accountId) || accounts[0];
  const oldAccount = accounts.find((a) => a.id === transaction.accountId);

  // Hitung pratinjau saldo setelah koreksi
  let projectedTargetBalance = targetAccount?.balance ?? 0;
  if (targetAccount) {
    if (targetAccount.id === transaction.accountId) {
      const reverted =
        transaction.kind === 'income'
          ? targetAccount.balance - transaction.amount
          : targetAccount.balance + transaction.amount;
      projectedTargetBalance =
        kind === 'income' ? reverted + numericAmount : reverted - numericAmount;
    } else {
      projectedTargetBalance =
        kind === 'income'
          ? targetAccount.balance + numericAmount
          : targetAccount.balance - numericAmount;
    }
  }

  const budgetImpact =
    kind === 'expense' && numericAmount > 0 && date.length >= 7
      ? previewBudgetImpact(
          allTransactions,
          preferences,
          category,
          date.slice(0, 7),
          numericAmount,
          transaction.id
        )
      : null;

  const handleSwitchKind = (next: TransactionKind) => {
    setKind(next);
    const nextList = getCategoriesForKind(preferences, next);
    if (!nextList.includes(category)) {
      setCategory(nextList[0] || 'Lainnya');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (numericAmount <= 0) {
      setErrorMsg('Nominal transaksi harus lebih dari Rp 0.');
      return;
    }
    if (!targetAccount) {
      setErrorMsg('Pilih rekening tujuan terlebih dahulu.');
      return;
    }

    try {
      await onSave({
        id: transaction.id,
        date,
        time,
        kind,
        amount: numericAmount,
        category,
        note,
        accountId: targetAccount.id
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memperbarui transaksi.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#0B1220]/60 p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-tx-modal-title"
    >
      <div className="w-full md:max-w-[430px] max-h-[92dvh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-white p-5 border border-[#DCE2EC] shadow-xl space-y-3.5">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#DCE2EC]">
          <h2 id="edit-tx-modal-title" className="text-base font-bold text-[#0B1220]">
            Edit Transaksi
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form edit transaksi"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#DCE2EC] text-[#0B1220] hover:bg-[#F3F5F8]"
          >
            <IconClose />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {errorMsg && (
            <p
              role="alert"
              className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-2.5 text-xs font-semibold text-[#9F1D2C]"
            >
              {errorMsg}
            </p>
          )}

          <div
            className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#F8FAFC] p-1 border border-[#DCE2EC]"
            role="radiogroup"
            aria-label="Jenis transaksi"
          >
            <button
              type="button"
              onClick={() => handleSwitchKind('expense')}
              aria-pressed={kind === 'expense'}
              className={`min-h-[42px] rounded-lg text-xs font-bold transition-colors ${
                kind === 'expense'
                  ? 'bg-[#9F1D2C] text-white'
                  : 'bg-white text-[#9F1D2C] hover:bg-[#FEF2F2]'
              }`}
            >
              Pengeluaran (-)
            </button>
            <button
              type="button"
              onClick={() => handleSwitchKind('income')}
              aria-pressed={kind === 'income'}
              className={`min-h-[42px] rounded-lg text-xs font-bold transition-colors ${
                kind === 'income'
                  ? 'bg-[#0D6848] text-white'
                  : 'bg-white text-[#0D6848] hover:bg-[#ECFDF5]'
              }`}
            >
              Pemasukan (+)
            </button>
          </div>

          <div>
            <label htmlFor="edit-tx-amount" className="block text-xs font-bold text-[#0B1220] mb-1">
              Nominal (Rp)
            </label>
            <div className="flex items-center rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3">
              <span
                className={`shrink-0 pr-2 text-base font-bold ${
                  kind === 'expense' ? 'text-[#9F1D2C]' : 'text-[#0D6848]'
                }`}
              >
                {kind === 'expense' ? '- Rp' : '+ Rp'}
              </span>
              <input
                id="edit-tx-amount"
                type="text"
                inputMode="numeric"
                value={amountRaw}
                onChange={(e) => {
                  const n = parseDigitsToNumber(e.target.value);
                  setAmountRaw(n > 0 ? formatNumberInput(n) : '');
                }}
                className={`w-full min-h-[46px] bg-transparent py-2 text-xl font-bold tnum focus:outline-none ${
                  kind === 'expense' ? 'text-[#9F1D2C]' : 'text-[#0D6848]'
                }`}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-tx-account" className="block text-xs font-bold text-[#0B1220] mb-1">
              Rekening
            </label>
            <select
              id="edit-tx-account"
              value={targetAccount?.id || ''}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs font-bold text-[#0B1220]"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatRupiah(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-tx-category" className="block text-xs font-bold text-[#0B1220] mb-1">
              Kategori
            </label>
            <select
              id="edit-tx-category"
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
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="edit-tx-date" className="block text-xs font-bold text-[#0B1220] mb-1">
                Tanggal
              </label>
              <input
                id="edit-tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 text-xs font-semibold text-[#0B1220] tnum"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-tx-time" className="block text-xs font-bold text-[#0B1220] mb-1">
                Jam
              </label>
              <input
                id="edit-tx-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 text-xs font-semibold text-[#0B1220] tnum"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-tx-note" className="block text-xs font-bold text-[#0B1220] mb-1">
              Catatan Keterangan
            </label>
            <input
              id="edit-tx-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan transaksi"
              className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0B1220]"
            />
          </div>

          {targetAccount && (
            <div className="rounded-xl bg-[#F8FAFC] border border-[#DCE2EC] p-3 text-xs space-y-1 tnum">
              <div className="flex items-center justify-between text-[#475569]">
                <span>Saldo {targetAccount.name} setelah edit</span>
                <strong
                  className={projectedTargetBalance < 0 ? 'text-[#9F1D2C]' : 'text-[#0B1220]'}
                >
                  {formatRupiah(projectedTargetBalance)}
                </strong>
              </div>
              {oldAccount && oldAccount.id !== targetAccount.id && (
                <p className="text-[11px] text-[#475569]">
                  Saldo {oldAccount.name} otomatis dikembalikan sebesar{' '}
                  {formatRupiah(transaction.amount)}.
                </p>
              )}
            </div>
          )}

          {budgetImpact && budgetImpact.status !== 'safe' && (
            <div
              role="status"
              className={`rounded-xl border p-2.5 text-xs font-semibold ${
                budgetImpact.status === 'exceeded'
                  ? 'bg-[#FEF2F2] border-[#FECACA] text-[#9F1D2C]'
                  : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
              }`}
            >
              {budgetImpact.status === 'exceeded'
                ? `Anggaran "${budgetImpact.category}" melewati batas (${budgetImpact.percent}% dari ${formatRupiah(budgetImpact.limit)}).`
                : `Anggaran "${budgetImpact.category}" mencapai ${budgetImpact.percent}% dari batas ${formatRupiah(budgetImpact.limit)}.`}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-xs font-bold text-[#0B1220] hover:bg-[#F8FAFC]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="flex-1 min-h-[48px] rounded-xl bg-[#0F4C81] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#09355C] disabled:bg-[#CBD5E1] disabled:text-[#475569]"
            >
              {isBusy ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
