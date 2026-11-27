import { describe, expect, it } from 'vitest';
import {
  applyAddAccount,
  applyAddTransaction,
  applyAddTransfer,
  applyDeleteTransaction,
  applyUpdateAccount,
  applyUpdateTransaction,
  computeDailyReport,
  computePeriodAnalytics,
  computeTotalBalance,
  filterTransactions
} from './ledger';
import { createPinLockConfig, verifyLocalPin } from './pinLock';
import {
  addCustomCategory,
  computeMonthlyBudgetStatuses,
  createDefaultPreferences,
  getCategoriesForKind,
  previewBudgetImpact,
  removeCustomCategory,
  setCategoryBudget
} from './preferences';
import type { LedgerState } from './types';

describe('Mesin Akuntansi Multi-Rekening KasPresisi', () => {
  const emptyState: LedgerState = {
    accounts: [],
    transactions: [],
    transfers: []
  };

  it('dapat menambah lebih dari satu rekening dan menghitung saldo gabungan', () => {
    let state = applyAddAccount(
      emptyState,
      {
        name: 'BCA Utama',
        type: 'bank',
        maskedNumber: '•••• 4821',
        roleTag: 'Tabungan',
        initialBalance: 5_000_000
      },
      'acc_1'
    );
    state = applyAddAccount(
      state,
      {
        name: 'Dompet Tunai',
        type: 'cash',
        maskedNumber: 'Kas Harian',
        roleTag: 'Harian',
        initialBalance: 500_000
      },
      'acc_2'
    );

    expect(state.accounts).toHaveLength(2);
    expect(computeTotalBalance(state.accounts)).toBe(5_500_000);
  });

  it('mengonversi pemasukan (+) dan pengeluaran (-) langsung ke saldo rekening dan dapat dibatalkan', () => {
    let state = applyAddAccount(
      emptyState,
      {
        name: 'BCA Utama',
        type: 'bank',
        maskedNumber: '•••• 4821',
        roleTag: 'Utama',
        initialBalance: 1_000_000
      },
      'acc_1'
    );

    state = applyAddTransaction(
      state,
      {
        date: '2026-11-26',
        time: '09:00',
        kind: 'income',
        amount: 750_000,
        category: 'Gaji',
        note: 'Bonus proyek',
        accountId: 'acc_1'
      },
      'tx_in'
    );
    expect(state.accounts[0].balance).toBe(1_750_000);

    state = applyAddTransaction(
      state,
      {
        date: '2026-11-26',
        time: '12:30',
        kind: 'expense',
        amount: 125_000,
        category: 'Makan',
        note: 'Makan siang',
        accountId: 'acc_1',
        receiptFileName: 'struk_makan.jpg'
      },
      'tx_out'
    );
    expect(state.accounts[0].balance).toBe(1_625_000);

    // Hapus pengeluaran mengembalikan saldo semula
    state = applyDeleteTransaction(state, 'tx_out');
    expect(state.accounts[0].balance).toBe(1_750_000);
  });

  it('dapat mengedit rekening beserta koreksi saldo dan menyelaraskan nama di riwayat', () => {
    let state = applyAddAccount(
      emptyState,
      {
        name: 'BCA Lama',
        type: 'bank',
        maskedNumber: '1111',
        roleTag: 'Utama',
        initialBalance: 1_000_000
      },
      'bca'
    );
    state = applyAddTransaction(
      state,
      {
        date: '2026-11-26',
        time: '10:00',
        kind: 'expense',
        amount: 100_000,
        category: 'Konsumsi & Makan',
        note: 'Kopi',
        accountId: 'bca'
      },
      'tx_1'
    );

    state = applyUpdateAccount(state, {
      id: 'bca',
      name: 'BCA Prioritas',
      type: 'bank',
      maskedNumber: '•••• 9999',
      roleTag: 'Tabungan Utama',
      balance: 1_250_000
    });

    expect(state.accounts[0].name).toBe('BCA Prioritas');
    expect(state.accounts[0].balance).toBe(1_250_000);
    expect(state.transactions[0].accountName).toBe('BCA Prioritas');
  });

  it('dapat mengedit transaksi termasuk ubah nominal, jenis, dan pindah rekening dengan saldo akurat', () => {
    let state = applyAddAccount(
      emptyState,
      { name: 'BCA', type: 'bank', maskedNumber: '1', roleTag: 'A', initialBalance: 1_000_000 },
      'bca'
    );
    state = applyAddAccount(
      state,
      { name: 'GoPay', type: 'ewallet', maskedNumber: '2', roleTag: 'B', initialBalance: 500_000 },
      'gopay'
    );

    state = applyAddTransaction(
      state,
      {
        date: '2026-11-26',
        time: '12:00',
        kind: 'expense',
        amount: 200_000,
        category: 'Belanja Harian',
        note: 'Supermarket',
        accountId: 'bca'
      },
      'tx_edit'
    );
    expect(state.accounts.find((a) => a.id === 'bca')?.balance).toBe(800_000);

    // Pindahkan transaksi ke GoPay dan ubah nominal menjadi 150.000
    state = applyUpdateTransaction(state, {
      id: 'tx_edit',
      date: '2026-11-27',
      time: '13:15',
      kind: 'expense',
      amount: 150_000,
      category: 'Konsumsi & Makan',
      note: 'Makan bersama',
      accountId: 'gopay'
    });

    expect(state.accounts.find((a) => a.id === 'bca')?.balance).toBe(1_000_000);
    expect(state.accounts.find((a) => a.id === 'gopay')?.balance).toBe(350_000);
    expect(state.transactions[0].accountName).toBe('GoPay');
    expect(state.transactions[0].note).toBe('Makan bersama');
  });

  it('memindahkan saldo antar rekening beserta biaya admin tanpa mengotori pengeluaran laporan harian', () => {
    let state = applyAddAccount(
      emptyState,
      {
        name: 'BCA',
        type: 'bank',
        maskedNumber: '1111',
        roleTag: 'Sumber',
        initialBalance: 2_000_000
      },
      'bca'
    );
    state = applyAddAccount(
      state,
      {
        name: 'Mandiri',
        type: 'bank',
        maskedNumber: '2222',
        roleTag: 'Tujuan',
        initialBalance: 300_000
      },
      'mandiri'
    );

    state = applyAddTransfer(
      state,
      {
        date: '2026-11-26',
        time: '14:00',
        fromAccountId: 'bca',
        toAccountId: 'mandiri',
        amount: 500_000,
        adminFee: 2_500,
        note: 'BI-Fast ke Mandiri'
      },
      'trf_1'
    );

    expect(state.accounts.find((a) => a.id === 'bca')?.balance).toBe(1_497_500);
    expect(state.accounts.find((a) => a.id === 'mandiri')?.balance).toBe(800_000);

    const report = computeDailyReport(state, '2026-11-26');
    expect(report.totalExpense).toBe(0);
    expect(report.transfers).toHaveLength(1);
  });

  it('menolak pemindahan saldo jika melebihi saldo rekening sumber', () => {
    let state = applyAddAccount(
      emptyState,
      { name: 'BCA', type: 'bank', maskedNumber: '1', roleTag: 'A', initialBalance: 100_000 },
      'bca'
    );
    state = applyAddAccount(
      state,
      { name: 'Tunai', type: 'cash', maskedNumber: '2', roleTag: 'B', initialBalance: 0 },
      'cash'
    );

    expect(() =>
      applyAddTransfer(state, {
        date: '2026-11-26',
        time: '15:00',
        fromAccountId: 'bca',
        toAccountId: 'cash',
        amount: 150_000,
        adminFee: 0,
        note: 'Gagal'
      })
    ).toThrow(/mencukupi/);
  });

  it('menghitung agregasi data harian, mingguan, dan bulanan dengan akurat', () => {
    let state = applyAddAccount(
      emptyState,
      { name: 'BCA', type: 'bank', maskedNumber: '1', roleTag: 'A', initialBalance: 0 },
      'bca'
    );
    state = applyAddTransaction(state, {
      date: '2026-11-26',
      time: '10:00',
      kind: 'income',
      amount: 1_000_000,
      category: 'Gaji',
      note: '',
      accountId: 'bca'
    });
    state = applyAddTransaction(state, {
      date: '2026-11-24',
      time: '13:00',
      kind: 'expense',
      amount: 200_000,
      category: 'Belanja',
      note: '',
      accountId: 'bca'
    });
    state = applyAddTransaction(state, {
      date: '2026-11-05',
      time: '09:00',
      kind: 'expense',
      amount: 300_000,
      category: 'Tagihan',
      note: '',
      accountId: 'bca'
    });

    const daily = computePeriodAnalytics(state.transactions, 'daily', '2026-11-26');
    const weekly = computePeriodAnalytics(state.transactions, 'weekly', '2026-11-26');
    const monthly = computePeriodAnalytics(state.transactions, 'monthly', '2026-11-26');

    expect(daily.totalIncome).toBe(1_000_000);
    expect(daily.totalExpense).toBe(0);
    expect(weekly.totalIncome).toBe(1_000_000);
    expect(weekly.totalExpense).toBe(200_000);
    expect(monthly.totalIncome).toBe(1_000_000);
    expect(monthly.totalExpense).toBe(500_000);
  });

  it('menyaring dan mencari riwayat transaksi berdasarkan kata kunci, kategori, jenis, dan rentang tanggal', () => {
    let state = applyAddAccount(
      emptyState,
      { name: 'BCA', type: 'bank', maskedNumber: '1', roleTag: 'A', initialBalance: 5_000_000 },
      'bca'
    );
    state = applyAddTransaction(state, {
      date: '2026-11-10',
      time: '09:00',
      kind: 'expense',
      amount: 45_000,
      category: 'Konsumsi & Makan',
      note: 'Kopi susu pagi',
      accountId: 'bca'
    });
    state = applyAddTransaction(state, {
      date: '2026-11-20',
      time: '15:00',
      kind: 'income',
      amount: 2_000_000,
      category: 'Pendapatan Proyek',
      note: 'DP Website',
      accountId: 'bca'
    });

    const byKeyword = filterTransactions(state.transactions, {
      query: 'kopi',
      kind: 'all',
      category: 'all',
      accountId: 'all',
      dateFrom: '',
      dateTo: ''
    });
    expect(byKeyword.items).toHaveLength(1);
    expect(byKeyword.totalExpense).toBe(45_000);

    const byDateRange = filterTransactions(state.transactions, {
      query: '',
      kind: 'income',
      category: 'all',
      accountId: 'all',
      dateFrom: '2026-11-15',
      dateTo: '2026-11-30'
    });
    expect(byDateRange.items).toHaveLength(1);
    expect(byDateRange.totalIncome).toBe(2_000_000);
  });

  it('mengelola kategori kustom serta menghitung status dan peringatan batas anggaran bulanan', () => {
    let prefs = createDefaultPreferences();
    prefs = addCustomCategory(prefs, 'expense', 'Cicilan Kendaraan');
    expect(getCategoriesForKind(prefs, 'expense')).toContain('Cicilan Kendaraan');

    prefs = setCategoryBudget(prefs, 'Konsumsi & Makan', 1_000_000);
    prefs = setCategoryBudget(prefs, 'Cicilan Kendaraan', 500_000);

    let state = applyAddAccount(
      emptyState,
      { name: 'BCA', type: 'bank', maskedNumber: '1', roleTag: 'A', initialBalance: 5_000_000 },
      'bca'
    );
    state = applyAddTransaction(state, {
      date: '2026-11-12',
      time: '12:00',
      kind: 'expense',
      amount: 850_000,
      category: 'Konsumsi & Makan',
      note: 'Makan',
      accountId: 'bca'
    });
    state = applyAddTransaction(state, {
      date: '2026-11-15',
      time: '14:00',
      kind: 'expense',
      amount: 550_000,
      category: 'Cicilan Kendaraan',
      note: 'Angsuran',
      accountId: 'bca'
    });

    const statuses = computeMonthlyBudgetStatuses(state.transactions, prefs, '2026-11');
    expect(statuses).toHaveLength(2);
    expect(statuses[0].category).toBe('Cicilan Kendaraan');
    expect(statuses[0].status).toBe('exceeded');
    expect(statuses[1].category).toBe('Konsumsi & Makan');
    expect(statuses[1].status).toBe('warning');

    const preview = previewBudgetImpact(
      state.transactions,
      prefs,
      'Konsumsi & Makan',
      '2026-11',
      200_000
    );
    expect(preview?.status).toBe('exceeded');
    expect(preview?.percent).toBe(105);

    prefs = removeCustomCategory(prefs, 'expense', 'Cicilan Kendaraan');
    expect(getCategoriesForKind(prefs, 'expense')).not.toContain('Cicilan Kendaraan');
    expect(prefs.monthlyBudgets['Cicilan Kendaraan']).toBeUndefined();
  });

  it('membuat dan memverifikasi kunci PIN lokal 4 digit dan 6 digit dengan benar', async () => {
    const cfg4 = await createPinLockConfig('2580', 4, 1);
    expect(cfg4.enabled).toBe(true);
    expect(await verifyLocalPin('2580', cfg4)).toBe(true);
    expect(await verifyLocalPin('0000', cfg4)).toBe(false);

    const cfg6 = await createPinLockConfig('147258', 6, 0);
    expect(await verifyLocalPin('147258', cfg6)).toBe(true);
    expect(await verifyLocalPin('147259', cfg6)).toBe(false);
  });
});
