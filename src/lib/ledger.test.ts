import { describe, expect, it } from 'vitest';
import {
  applyAddAccount,
  applyAddTransaction,
  applyAddTransfer,
  applyDeleteTransaction,
  computeDailyReport,
  computePeriodAnalytics,
  computeTotalBalance
} from './ledger';
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
});
