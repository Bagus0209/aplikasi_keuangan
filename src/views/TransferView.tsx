import React, { useEffect, useState } from 'react';
import {
  formatNumberInput,
  formatRupiah,
  getNowTime,
  getTodayIso,
  parseDigitsToNumber
} from '../lib/format';
import { previewTransferBalances, type NewTransferInput } from '../lib/ledger';
import type { Account, Transfer } from '../lib/types';

interface TransferViewProps {
  accounts: Account[];
  transfers: Transfer[];
  isBusy: boolean;
  onSaveTransfer: (input: NewTransferInput) => Promise<void>;
  onGoToAddAccount: () => void;
}

const FEE_PRESETS = [
  { label: 'Gratis Rp 0', value: 0 },
  { label: 'BI-Fast Rp 2.500', value: 2500 },
  { label: 'Online Rp 6.500', value: 6500 }
];

export function TransferView({
  accounts,
  transfers,
  isBusy,
  onSaveTransfer,
  onGoToAddAccount
}: TransferViewProps): React.ReactElement {
  const [fromId, setFromId] = useState<string>(accounts[0]?.id || '');
  const [toId, setToId] = useState<string>(accounts[1]?.id || accounts[0]?.id || '');
  const [amountRaw, setAmountRaw] = useState('');
  const [adminFeeRaw, setAdminFeeRaw] = useState('0');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getTodayIso());
  const [time, setTime] = useState(getNowTime());
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!accounts.some((a) => a.id === fromId) && accounts[0]) {
      setFromId(accounts[0].id);
    }
    if (!accounts.some((a) => a.id === toId)) {
      setToId(accounts[1]?.id || accounts[0]?.id || '');
    }
  }, [accounts, fromId, toId]);

  if (accounts.length < 2) {
    return (
      <div className="rounded-2xl bg-white p-5 border border-[#DCE2EC] space-y-3">
        <h2 className="text-base font-bold text-[#0B1220]">Butuh Minimal 2 Rekening</h2>
        <p className="text-xs leading-relaxed text-[#475569]">
          Fitur pemindahan saldo memindahkan dana dari satu rekening ke rekening lainnya (misalnya dari BCA ke Mandiri atau tarik tunai ke Kas Harian). Saat ini Anda baru memiliki {accounts.length} rekening.
        </p>
        <button
          type="button"
          onClick={onGoToAddAccount}
          className="w-full min-h-[46px] rounded-xl bg-[#0F4C81] px-4 py-2.5 text-xs font-bold text-white"
        >
          + Tambah Rekening Kedua Sekarang
        </button>
      </div>
    );
  }

  const fromAcc = accounts.find((a) => a.id === fromId);
  const toAcc = accounts.find((a) => a.id === toId);
  const amount = parseDigitsToNumber(amountRaw);
  const adminFee = parseDigitsToNumber(adminFeeRaw);
  const preview = previewTransferBalances(fromAcc, toAcc, amount, adminFee);

  const handleSwap = () => {
    setFromId(toId);
    setToId(fromId);
    setStatusMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!preview.valid) {
      setStatusMsg({ type: 'err', text: preview.error || 'Data pemindahan belum valid.' });
      return;
    }

    try {
      await onSaveTransfer({
        date,
        time,
        fromAccountId: fromId,
        toAccountId: toId,
        amount,
        adminFee,
        note
      });
      setAmountRaw('');
      setNote('');
      setTime(getNowTime());
      setStatusMsg({
        type: 'ok',
        text: `Berhasil memindahkan ${formatRupiah(amount)} dari ${fromAcc?.name} ke ${toAcc?.name}.`
      });
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal mencatat pemindahan saldo.'
      });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-[#0B1220]">Pindah Saldo Antar Rekening</h2>

      {statusMsg && (
        <div
          role={statusMsg.type === 'err' ? 'alert' : 'status'}
          className={`rounded-xl p-3 text-xs font-semibold border ${
            statusMsg.type === 'err'
              ? 'bg-[#FEF2F2] border-[#FECACA] text-[#9F1D2C]'
              : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#0D6848]'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Kartu Rekening Sumber */}
        <section className="rounded-2xl bg-white p-4 border border-[#DCE2EC] space-y-2">
          <label htmlFor="trf-from" className="block text-xs font-bold text-[#9F1D2C]">
            Dari rekening sumber
          </label>
          <select
            id="trf-from"
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="w-full min-h-[46px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm font-bold text-[#0B1220]"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({formatRupiah(acc.balance)})
              </option>
            ))}
          </select>
          {fromAcc && (
            <p className="text-xs text-[#475569] tnum">
              Saldo awal: {formatRupiah(preview.fromBefore)} {'->'} Sisa:{' '}
              <strong className={preview.fromAfter < 0 ? 'text-[#9F1D2C]' : 'text-[#0B1220]'}>
                {formatRupiah(preview.fromAfter)}
              </strong>
            </p>
          )}
        </section>

        {/* Tombol Tukar Posisi */}
        <button
          type="button"
          onClick={handleSwap}
          className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-bold text-[#0F4C81] hover:bg-[#F8FAFC]"
        >
          Tukar Posisi Rekening Sumber & Tujuan
        </button>

        {/* Kartu Rekening Tujuan */}
        <section className="rounded-2xl bg-white p-4 border border-[#DCE2EC] space-y-2">
          <label htmlFor="trf-to" className="block text-xs font-bold text-[#0D6848]">
            Ke rekening tujuan
          </label>
          <select
            id="trf-to"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="w-full min-h-[46px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm font-bold text-[#0B1220]"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({formatRupiah(acc.balance)})
              </option>
            ))}
          </select>
          {toAcc && (
            <p className="text-xs text-[#475569] tnum">
              Saldo awal: {formatRupiah(preview.toBefore)} {'->'} Menjadi:{' '}
              <strong className="text-[#0D6848]">{formatRupiah(preview.toAfter)}</strong>
            </p>
          )}
        </section>

        {/* Kartu Nominal & Biaya Admin */}
        <section className="rounded-2xl bg-white p-4 border-2 border-[#0F4C81] space-y-3">
          <div>
            <label htmlFor="trf-amount" className="block text-xs font-bold text-[#475569] mb-1">
              Nominal Pemindahan (Rp)
            </label>
            <input
              id="trf-amount"
              type="text"
              inputMode="numeric"
              value={amountRaw}
              onChange={(e) => {
                const n = parseDigitsToNumber(e.target.value);
                setAmountRaw(n > 0 ? formatNumberInput(n) : '');
              }}
              placeholder="0"
              className="w-full min-h-[48px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2 text-xl font-bold text-[#0B1220] tnum"
              required
            />
          </div>

          <div>
            <label htmlFor="trf-fee" className="block text-xs font-bold text-[#0B1220] mb-1.5">
              Biaya Admin Bank (Dipotong dari Rekening Sumber)
            </label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {FEE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() =>
                    setAdminFeeRaw(preset.value > 0 ? formatNumberInput(preset.value) : '0')
                  }
                  className={`min-h-[40px] rounded-lg border text-[11px] font-bold tnum ${
                    adminFee === preset.value
                      ? 'border-[#0F4C81] bg-[#0F4C81] text-white'
                      : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#0B1220]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              id="trf-fee"
              type="text"
              inputMode="numeric"
              value={adminFeeRaw}
              onChange={(e) => {
                const n = parseDigitsToNumber(e.target.value);
                setAdminFeeRaw(n > 0 ? formatNumberInput(n) : '0');
              }}
              className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs font-bold text-[#0B1220] tnum"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="trf-date" className="block text-xs font-bold text-[#0B1220] mb-1">
                Tanggal
              </label>
              <input
                id="trf-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 text-xs font-semibold text-[#0B1220] tnum"
                required
              />
            </div>
            <div>
              <label htmlFor="trf-note" className="block text-xs font-bold text-[#0B1220] mb-1">
                Catatan
              </label>
              <input
                id="trf-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Top up operasional"
                className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 text-xs text-[#0B1220]"
              />
            </div>
          </div>
        </section>

        <p className="text-xs leading-relaxed text-[#475569] px-1">
          Mutasi antar rekening dicatat di tab khusus dan tidak dihitung sebagai pengeluaran pada laporan harian.
        </p>

        {amount > 0 && !preview.valid && preview.error && (
          <p role="alert" className="text-xs font-bold text-[#9F1D2C] px-1">
            {preview.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isBusy || !preview.valid}
          className="w-full min-h-[50px] rounded-xl bg-[#0F4C81] px-4 py-3 text-sm font-bold text-white hover:bg-[#09355C] disabled:bg-[#CBD5E1] disabled:text-[#475569]"
        >
          {isBusy
            ? 'Menyimpan Pemindahan...'
            : amount > 0
              ? `Catat Pemindahan ${formatRupiah(amount)}`
              : 'Masukkan Nominal Pemindahan'}
        </button>
      </form>

      {/* Riwayat Pemindahan Terakhir */}
      {transfers.length > 0 && (
        <section className="rounded-2xl bg-white p-4 border border-[#DCE2EC] space-y-2.5">
          <h3 className="text-xs font-bold text-[#0B1220]">
            Riwayat Pemindahan Saldo ({transfers.length})
          </h3>
          <div className="divide-y divide-[#F1F5F9]">
            {transfers.slice(0, 8).map((tr) => (
              <div key={tr.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0B1220] truncate">
                    {tr.fromAccountName} {'->'} {tr.toAccountName}
                  </p>
                  <p className="text-[11px] text-[#475569]">
                    {tr.date} {tr.time}
                    {tr.adminFee > 0 ? ` • Admin ${formatRupiah(tr.adminFee)}` : ''}
                    {tr.note ? ` • ${tr.note}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold text-[#0F4C81] tnum">
                  {formatRupiah(tr.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
