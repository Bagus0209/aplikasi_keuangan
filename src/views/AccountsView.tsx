import React, { useState } from 'react';
import {
  formatNumberInput,
  formatRupiah,
  getTodayIso,
  parseDigitsToNumber
} from '../lib/format';
import { computeTotalBalance, type NewAccountInput } from '../lib/ledger';
import type { Account, AccountType, Transaction } from '../lib/types';

interface AccountsViewProps {
  accounts: Account[];
  transactions: Transaction[];
  isBusy: boolean;
  onAddAccount: (input: NewAccountInput) => Promise<void>;
  onDeleteAccount: (accountId: string) => Promise<void>;
  onQuickRecordForAccount: (accountId: string) => void;
  onLoadSimulation: () => void;
  onOpenSettings: () => void;
}

export function AccountsView({
  accounts,
  transactions,
  isBusy,
  onAddAccount,
  onDeleteAccount,
  onQuickRecordForAccount,
  onLoadSimulation,
  onOpenSettings
}: AccountsViewProps): React.ReactElement {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [maskedNumber, setMaskedNumber] = useState('');
  const [roleTag, setRoleTag] = useState('');
  const [initialBalanceRaw, setInitialBalanceRaw] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Nama rekening wajib diisi (contoh: BCA Tahapan atau Dompet Tunai).');
      return;
    }
    try {
      await onAddAccount({
        name: name.trim(),
        type,
        maskedNumber: maskedNumber.trim(),
        roleTag: roleTag.trim() || defaultRoleForType(type),
        initialBalance: parseDigitsToNumber(initialBalanceRaw)
      });
      setName('');
      setMaskedNumber('');
      setRoleTag('');
      setInitialBalanceRaw('');
      setShowAddForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menambah rekening.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Kartu Total Saldo Gabungan */}
      <section
        aria-label="Ringkasan total saldo"
        className="rounded-2xl bg-[#0B1220] p-5 text-white shadow-sm"
      >
        <div className="flex items-center justify-between gap-2 text-xs text-[#CBD5E1]">
          <span>Total Saldo ({accounts.length} Rekening)</span>
          {hasSimulation && (
            <span className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white">
              [SIMULASI SALDO]
            </span>
          )}
        </div>
        <p className="mt-1.5 text-3xl font-bold tracking-tight tnum">
          {formatRupiah(totalBalance)}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/15 text-xs font-semibold tnum">
          <span className="text-[#6EE7B7]">Masuk bln ini: {formatRupiah(monthIncome, true)}</span>
          <span className="text-[#FCA5A5]">Keluar: {formatRupiah(-monthExpense)}</span>
        </div>
      </section>

      {/* Header Daftar Rekening */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[#0B1220]">
          Daftar Rekening Aktif ({accounts.length})
        </h2>
        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0F4C81] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#09355C] active:bg-[#072846]"
        >
          {showAddForm ? 'Tutup Form' : '+ Rekening'}
        </button>
      </div>

      {/* Form Tambah Rekening */}
      {showAddForm && (
        <form
          onSubmit={handleCreateAccount}
          className="rounded-2xl bg-white p-4 border-2 border-[#0F4C81] space-y-3"
        >
          <h3 className="text-sm font-bold text-[#0B1220]">Tambah Rekening Baru</h3>

          {formError && (
            <p role="alert" className="rounded-lg bg-[#FEF2F2] p-2.5 text-xs font-semibold text-[#9F1D2C]">
              {formError}
            </p>
          )}

          <div>
            <label htmlFor="acc-name" className="block text-xs font-bold text-[#0B1220] mb-1">
              Nama Rekening / Dompet
            </label>
            <input
              id="acc-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: BCA Utama, GoPay, Kas Tunai"
              className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0B1220]"
              required
            />
          </div>

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
                onClick={() => setType(opt.key)}
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
                Fungsi Rekening
              </label>
              <input
                id="acc-role"
                type="text"
                value={roleTag}
                onChange={(e) => setRoleTag(e.target.value)}
                placeholder="Gaji / Harian"
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
                setInitialBalanceRaw(num > 0 ? formatNumberInput(num) : e.target.value === '0' ? '0' : '');
              }}
              placeholder="0"
              className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-base font-bold text-[#0B1220] tnum"
            />
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full min-h-[48px] rounded-xl bg-[#0F4C81] px-4 py-3 text-sm font-bold text-white hover:bg-[#09355C] disabled:bg-[#CBD5E1] disabled:text-[#475569]"
          >
            {isBusy ? 'Menyimpan Rekening...' : 'Simpan Rekening Baru'}
          </button>
        </form>
      )}

      {/* Empty State Jujur */}
      {accounts.length === 0 ? (
        <div className="rounded-2xl bg-white p-5 border border-[#DCE2EC] space-y-3">
          <h3 className="text-sm font-bold text-[#0B1220]">Belum Ada Rekening Tercatat</h3>
          <p className="text-xs leading-relaxed text-[#475569]">
            Tambahkan minimal satu rekening (misalnya BCA, Mandiri, E-Wallet, atau Kas Tunai) untuk mulai mencatat pemasukan dan pengeluaran, atau sambungkan ke Google Sheet pribadi Anda.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
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
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <article
              key={acc.id}
              className="rounded-2xl bg-white p-4 border border-[#DCE2EC] transition-colors hover:border-[#94A3B8]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-[#0B1220]">{acc.name}</h3>
                  <p className="text-xs font-medium text-[#475569] mt-0.5">{acc.maskedNumber}</p>
                </div>
                <span className="rounded-md bg-[#EFF6FF] px-2.5 py-1 text-xs font-semibold text-[#0F4C81]">
                  {acc.roleTag}
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-2 pt-2.5 border-t border-[#F1F5F9]">
                <span className="text-xs font-medium text-[#475569]">Saldo Aktif</span>
                <span
                  className={`text-lg font-bold tnum ${
                    acc.balance < 0 ? 'text-[#9F1D2C]' : 'text-[#0B1220]'
                  }`}
                >
                  {formatRupiah(acc.balance)}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onQuickRecordForAccount(acc.id)}
                  className="flex-1 min-h-[44px] rounded-xl bg-[#F3F5F8] px-3 py-2 text-xs font-bold text-[#0B1220] hover:bg-[#E2E8F0]"
                >
                  Catat Transaksi di Rekening Ini
                </button>

                {confirmDeleteId !== acc.id ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(acc.id)}
                    aria-label={`Hapus rekening ${acc.name}`}
                    className="min-h-[44px] rounded-xl border border-[#DCE2EC] bg-white px-3 py-2 text-xs font-semibold text-[#475569] hover:border-[#FECACA] hover:text-[#9F1D2C]"
                  >
                    Hapus
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={async () => {
                        await onDeleteAccount(acc.id);
                        setConfirmDeleteId(null);
                      }}
                      className="min-h-[44px] rounded-xl bg-[#9F1D2C] px-3 py-2 text-xs font-bold text-white"
                    >
                      Ya, Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="min-h-[44px] rounded-xl border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs font-semibold text-[#0B1220]"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}

          {!showAddForm && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full min-h-[52px] rounded-2xl border-2 border-dashed border-[#0F4C81] bg-white px-4 py-3 text-xs font-bold text-[#0F4C81] hover:bg-[#F8FAFC]"
            >
              + Tambah Rekening Baru (Bank / E-Wallet / Tunai)
            </button>
          )}
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
