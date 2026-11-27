import React, { useEffect, useState } from 'react';
import { IconClose, IconTarget } from './Icons';
import { formatNumberInput, formatRupiah, parseDigitsToNumber } from '../lib/format';
import {
  addCustomCategory,
  getCategoriesForKind,
  removeCustomCategory,
  setCategoryBudget
} from '../lib/preferences';
import type { TransactionKind, UserPreferences } from '../lib/types';

interface BudgetCategoryModalProps {
  isOpen: boolean;
  preferences: UserPreferences;
  initialSection?: 'budgets' | 'categories';
  onClose: () => void;
  onChangePreferences: (next: UserPreferences) => void;
}

export function BudgetCategoryModal({
  isOpen,
  preferences,
  initialSection = 'budgets',
  onClose,
  onChangePreferences
}: BudgetCategoryModalProps): React.ReactElement | null {
  const [section, setSection] = useState<'budgets' | 'categories'>(initialSection);
  const [catKind, setCatKind] = useState<TransactionKind>('expense');
  const [newCatName, setNewCatName] = useState('');
  const [catError, setCatError] = useState<string | null>(null);

  const [selectedBudgetCat, setSelectedBudgetCat] = useState('');
  const [budgetAmountRaw, setBudgetAmountRaw] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSection(initialSection);
      setCatError(null);
      setFeedback(null);
      const expenseCats = getCategoriesForKind(preferences, 'expense');
      if (!selectedBudgetCat || !expenseCats.includes(selectedBudgetCat)) {
        const first = expenseCats[0] || 'Konsumsi & Makan';
        setSelectedBudgetCat(first);
        const existingLimit = preferences.monthlyBudgets[first] || 0;
        setBudgetAmountRaw(existingLimit > 0 ? formatNumberInput(existingLimit) : '');
      }
    }
  }, [isOpen, initialSection, preferences, selectedBudgetCat]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const expenseCategories = getCategoriesForKind(preferences, 'expense');
  const customCategoriesForKind =
    catKind === 'expense'
      ? preferences.customExpenseCategories
      : preferences.customIncomeCategories;

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);
    setFeedback(null);
    try {
      const next = addCustomCategory(preferences, catKind, newCatName);
      onChangePreferences(next);
      setNewCatName('');
      setFeedback(`Kategori "${newCatName.trim()}" ditambahkan.`);
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Gagal menambah kategori.');
    }
  };

  const handleRemoveCategory = (name: string) => {
    const next = removeCustomCategory(preferences, catKind, name);
    onChangePreferences(next);
    setFeedback(`Kategori kustom "${name}" dihapus.`);
  };

  const handlePickBudgetCategory = (cat: string) => {
    setSelectedBudgetCat(cat);
    const existing = preferences.monthlyBudgets[cat] || 0;
    setBudgetAmountRaw(existing > 0 ? formatNumberInput(existing) : '');
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const limit = parseDigitsToNumber(budgetAmountRaw);
    const next = setCategoryBudget(preferences, selectedBudgetCat, limit);
    onChangePreferences(next);
    setFeedback(
      limit > 0
        ? `Anggaran "${selectedBudgetCat}" disetel ${formatRupiah(limit)} per bulan.`
        : `Batas anggaran "${selectedBudgetCat}" dihapus.`
    );
  };

  const handleThresholdChange = (pct: number) => {
    onChangePreferences({
      ...preferences,
      budgetWarningThresholdPct: pct
    });
    setFeedback(`Peringatan anggaran akan muncul mulai ${pct}% pemakaian.`);
  };

  const activeBudgets = Object.entries(preferences.monthlyBudgets).filter(([, v]) => v > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#0B1220]/60 p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-cat-modal-title"
    >
      <div className="w-full md:max-w-[430px] max-h-[92dvh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-white p-5 border border-[#DCE2EC] shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#DCE2EC]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0F4C81] text-white">
              <IconTarget className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 id="budget-cat-modal-title" className="text-base font-bold text-[#0B1220] truncate">
                Anggaran & Kategori Kustom
              </h2>
              <p className="text-xs text-[#475569] truncate">
                Atur batas pengeluaran bulanan dan kategori Anda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan anggaran dan kategori"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#DCE2EC] text-[#0B1220] hover:bg-[#F3F5F8]"
          >
            <IconClose />
          </button>
        </div>

        {/* Switch Tab */}
        <div
          className="grid grid-cols-2 gap-1 rounded-xl bg-[#F8FAFC] p-1 border border-[#DCE2EC]"
          role="tablist"
          aria-label="Pilih tab pengaturan anggaran atau kategori"
        >
          <button
            type="button"
            role="tab"
            aria-selected={section === 'budgets'}
            onClick={() => setSection('budgets')}
            className={`min-h-[42px] rounded-lg text-xs font-bold transition-colors ${
              section === 'budgets'
                ? 'bg-[#0F4C81] text-white'
                : 'text-[#475569] hover:bg-white'
            }`}
          >
            Anggaran Bulanan ({activeBudgets.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={section === 'categories'}
            onClick={() => setSection('categories')}
            className={`min-h-[42px] rounded-lg text-xs font-bold transition-colors ${
              section === 'categories'
                ? 'bg-[#0F4C81] text-white'
                : 'text-[#475569] hover:bg-white'
            }`}
          >
            Kategori Kustom
          </button>
        </div>

        {feedback && (
          <p
            role="status"
            className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-2.5 text-xs font-semibold text-[#0D6848]"
          >
            {feedback}
          </p>
        )}

        {section === 'budgets' ? (
          <div className="space-y-4">
            <form onSubmit={handleSaveBudget} className="rounded-xl bg-[#F8FAFC] border border-[#DCE2EC] p-3.5 space-y-3">
              <div>
                <label htmlFor="budget-cat-select" className="block text-xs font-bold text-[#0B1220] mb-1">
                  Pilih Kategori Pengeluaran
                </label>
                <select
                  id="budget-cat-select"
                  value={selectedBudgetCat}
                  onChange={(e) => handlePickBudgetCategory(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-semibold text-[#0B1220]"
                >
                  {expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                      {preferences.monthlyBudgets[cat]
                        ? ` (Batas: ${formatRupiah(preferences.monthlyBudgets[cat])})`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="budget-limit-input" className="block text-xs font-bold text-[#0B1220] mb-1">
                  Batas Anggaran per Bulan (Rp)
                </label>
                <input
                  id="budget-limit-input"
                  type="text"
                  inputMode="numeric"
                  value={budgetAmountRaw}
                  onChange={(e) => {
                    const n = parseDigitsToNumber(e.target.value);
                    setBudgetAmountRaw(n > 0 ? formatNumberInput(n) : '');
                  }}
                  placeholder="Contoh: 1.500.000 (kosongkan untuk hapus)"
                  className="w-full min-h-[44px] rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm font-bold text-[#0B1220] tnum"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-[#0F4C81] px-4 py-2 text-xs font-bold text-white hover:bg-[#09355C]"
              >
                Simpan Batas Anggaran
              </button>
            </form>

            {/* Ambang Peringatan */}
            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-[#0B1220]">
                Munculkan Peringatan Saat Pemakaian Mencapai
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[70, 80, 90].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleThresholdChange(pct)}
                    className={`min-h-[40px] rounded-xl border text-xs font-bold tnum ${
                      preferences.budgetWarningThresholdPct === pct
                        ? 'border-[#0F4C81] bg-[#EFF6FF] text-[#0F4C81]'
                        : 'border-[#CBD5E1] bg-white text-[#475569]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Daftar Anggaran Aktif */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#0B1220]">Daftar Batas Anggaran Aktif</h3>
              {activeBudgets.length === 0 ? (
                <p className="rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] p-3 text-xs text-[#475569]">
                  Belum ada batas anggaran bulanan. Pilih kategori di atas lalu masukkan nominal batas bulanan Anda.
                </p>
              ) : (
                <div className="divide-y divide-[#F1F5F9] rounded-xl border border-[#DCE2EC] bg-white px-3">
                  {activeBudgets.map(([cat, limit]) => (
                    <div key={cat} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#0B1220] truncate">{cat}</p>
                        <p className="text-[11px] font-semibold text-[#475569] tnum">
                          Maks. {formatRupiah(limit)} / bulan
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePickBudgetCategory(cat)}
                          className="min-h-[36px] rounded-lg border border-[#CBD5E1] px-2.5 text-[11px] font-bold text-[#0F4C81] hover:bg-[#EFF6FF]"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onChangePreferences(setCategoryBudget(preferences, cat, 0));
                            setFeedback(`Anggaran "${cat}" dihapus.`);
                          }}
                          className="min-h-[36px] rounded-lg bg-[#FEF2F2] px-2.5 text-[11px] font-bold text-[#9F1D2C]"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCatKind('expense');
                  setCatError(null);
                }}
                className={`min-h-[42px] rounded-xl border text-xs font-bold ${
                  catKind === 'expense'
                    ? 'border-[#9F1D2C] bg-[#9F1D2C] text-white'
                    : 'border-[#CBD5E1] bg-white text-[#475569]'
                }`}
              >
                Kategori Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => {
                  setCatKind('income');
                  setCatError(null);
                }}
                className={`min-h-[42px] rounded-xl border text-xs font-bold ${
                  catKind === 'income'
                    ? 'border-[#0D6848] bg-[#0D6848] text-white'
                    : 'border-[#CBD5E1] bg-white text-[#475569]'
                }`}
              >
                Kategori Pemasukan
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-2">
              <label htmlFor="new-custom-cat" className="block text-xs font-bold text-[#0B1220]">
                Tambah Kategori {catKind === 'expense' ? 'Pengeluaran' : 'Pemasukan'} Baru
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="new-custom-cat"
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder={
                    catKind === 'expense'
                      ? 'Contoh: Cicilan, Hiburan, Pendidikan'
                      : 'Contoh: Dividen, Freelance, Bonus'
                  }
                  className="flex-1 min-h-[44px] rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0B1220]"
                  required
                />
                <button
                  type="submit"
                  className="min-h-[44px] shrink-0 rounded-xl bg-[#0F4C81] px-4 text-xs font-bold text-white hover:bg-[#09355C]"
                >
                  Tambah
                </button>
              </div>
              {catError && (
                <p role="alert" className="text-xs font-semibold text-[#9F1D2C]">
                  {catError}
                </p>
              )}
            </form>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#0B1220]">
                Kategori Kustom Anda ({customCategoriesForKind.length})
              </h3>
              {customCategoriesForKind.length === 0 ? (
                <p className="rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] p-3 text-xs text-[#475569]">
                  Belum ada kategori kustom untuk{' '}
                  {catKind === 'expense' ? 'pengeluaran' : 'pemasukan'}. Tambahkan di atas agar
                  muncul saat mencatat transaksi.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {customCategoriesForKind.map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] pl-3 pr-1.5 py-1 text-xs font-semibold text-[#0B1220]"
                    >
                      <span>{cat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(cat)}
                        aria-label={`Hapus kategori ${cat}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#9F1D2C] hover:bg-[#FEF2F2]"
                      >
                        <IconClose className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
