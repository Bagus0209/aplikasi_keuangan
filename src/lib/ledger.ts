import { getMondayOfWeek, getNowTime, getTodayIso, shiftIsoDate } from './format';
import type {
  Account,
  AccountColorTheme,
  AccountEmblemKind,
  AccountType,
  LedgerState,
  PeriodFilter,
  Transaction,
  TransactionKind,
  TransactionSearchFilter,
  Transfer
} from './types';

export interface NewAccountInput {
  name: string;
  type: AccountType;
  maskedNumber: string;
  roleTag: string;
  initialBalance: number;
  colorTheme?: AccountColorTheme;
  emblem?: AccountEmblemKind;
}

export interface UpdateAccountInput {
  id: string;
  name: string;
  type: AccountType;
  maskedNumber: string;
  roleTag: string;
  balance?: number;
  colorTheme?: AccountColorTheme;
  emblem?: AccountEmblemKind;
}

export interface NewTransactionInput {
  date: string;
  time: string;
  kind: TransactionKind;
  amount: number;
  category: string;
  note: string;
  accountId: string;
  receiptPreviewDataUrl?: string;
  receiptFileName?: string;
  receiptUrl?: string;
  receiptFileId?: string;
}

export interface UpdateTransactionInput {
  id: string;
  date: string;
  time: string;
  kind: TransactionKind;
  amount: number;
  category: string;
  note: string;
  accountId: string;
}

export interface NewTransferInput {
  date: string;
  time: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  adminFee: number;
  note: string;
}

export interface BalancePreview {
  valid: boolean;
  balanceBefore: number;
  delta: number;
  balanceAfter: number;
  warning?: string;
}

export interface TransferPreview {
  valid: boolean;
  fromBefore: number;
  fromAfter: number;
  toBefore: number;
  toAfter: number;
  totalDeducted: number;
  error?: string;
}

export interface ChartBucket {
  label: string;
  income: number;
  expense: number;
  isCurrent?: boolean;
}

export interface PeriodAnalyticsResult {
  periodLabel: string;
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  buckets: ChartBucket[];
  filteredTransactions: Transaction[];
  crossPeriodRecap: {
    daily: { income: number; expense: number };
    weekly: { income: number; expense: number };
    monthly: { income: number; expense: number };
  };
}

export interface TransactionSearchResult {
  items: Transaction[];
  totalIncome: number;
  totalExpense: number;
  net: number;
}

export interface DailyReportData {
  date: string;
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  transactions: Transaction[];
  transfers: Transfer[];
}

export function computeTotalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, acc) => sum + acc.balance, 0);
}

export function applyAddAccount(
  state: LedgerState,
  input: NewAccountInput,
  customId?: string
): LedgerState {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Nama rekening wajib diisi.');
  }
  const initialBalance = Math.max(0, Math.round(input.initialBalance || 0));
  const newAccount: Account = {
    id: customId || `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    type: input.type,
    maskedNumber: input.maskedNumber.trim() || labelForAccountType(input.type),
    roleTag: input.roleTag.trim() || 'Rekening Aktif',
    initialBalance,
    balance: initialBalance,
    createdAt: new Date().toISOString(),
    colorTheme: input.colorTheme,
    emblem: input.emblem
  };

  return {
    ...state,
    accounts: [...state.accounts, newAccount]
  };
}

export function applyUpdateAccount(
  state: LedgerState,
  input: UpdateAccountInput
): LedgerState {
  const existing = state.accounts.find((a) => a.id === input.id);
  if (!existing) {
    throw new Error('Rekening yang akan diubah tidak ditemukan.');
  }
  const name = input.name.trim();
  if (!name) {
    throw new Error('Nama rekening wajib diisi.');
  }

  const nextBalance =
    typeof input.balance === 'number' && Number.isFinite(input.balance)
      ? Math.round(input.balance)
      : existing.balance;

  const updatedAccounts = state.accounts.map((acc) => {
    if (acc.id !== input.id) return acc;
    return {
      ...acc,
      name,
      type: input.type,
      maskedNumber: input.maskedNumber.trim() || labelForAccountType(input.type),
      roleTag: input.roleTag.trim() || 'Rekening Aktif',
      balance: nextBalance,
      colorTheme: input.colorTheme ?? acc.colorTheme,
      emblem: input.emblem ?? acc.emblem
    };
  });

  const updatedTransactions =
    name === existing.name
      ? state.transactions
      : state.transactions.map((tx) =>
          tx.accountId === input.id ? { ...tx, accountName: name } : tx
        );

  const updatedTransfers =
    name === existing.name
      ? state.transfers
      : state.transfers.map((tr) => ({
          ...tr,
          fromAccountName: tr.fromAccountId === input.id ? name : tr.fromAccountName,
          toAccountName: tr.toAccountId === input.id ? name : tr.toAccountName
        }));

  return {
    ...state,
    accounts: updatedAccounts,
    transactions: updatedTransactions,
    transfers: updatedTransfers
  };
}

export function applyDeleteAccount(state: LedgerState, accountId: string): LedgerState {
  return {
    ...state,
    accounts: state.accounts.filter((a) => a.id !== accountId)
  };
}

export function previewTransactionBalance(
  account: Account | undefined,
  kind: TransactionKind,
  amount: number
): BalancePreview {
  if (!account) {
    return {
      valid: false,
      balanceBefore: 0,
      delta: 0,
      balanceAfter: 0,
      warning: 'Pilih rekening terlebih dahulu.'
    };
  }
  const cleanAmount = Math.max(0, Math.round(amount || 0));
  const delta = kind === 'income' ? cleanAmount : -cleanAmount;
  const balanceAfter = account.balance + delta;
  const warning =
    kind === 'expense' && cleanAmount > 0 && balanceAfter < 0
      ? 'Perhatian: pengeluaran ini membuat saldo rekening menjadi minus.'
      : undefined;

  return {
    valid: cleanAmount > 0,
    balanceBefore: account.balance,
    delta,
    balanceAfter,
    warning
  };
}

export function applyAddTransaction(
  state: LedgerState,
  input: NewTransactionInput,
  customId?: string
): LedgerState {
  const account = state.accounts.find((a) => a.id === input.accountId);
  if (!account) {
    throw new Error('Rekening tujuan tidak ditemukan.');
  }
  const amount = Math.round(Math.abs(input.amount || 0));
  if (amount <= 0) {
    throw new Error('Nominal transaksi harus lebih dari Rp 0.');
  }

  const balanceBefore = account.balance;
  const balanceAfter = input.kind === 'income' ? balanceBefore + amount : balanceBefore - amount;

  const tx: Transaction = {
    id: customId || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: input.date || getTodayIso(),
    time: input.time || getNowTime(),
    kind: input.kind,
    amount,
    category: input.category.trim() || (input.kind === 'income' ? 'Pemasukan' : 'Pengeluaran'),
    note: input.note.trim(),
    accountId: account.id,
    accountName: account.name,
    balanceBefore,
    balanceAfter,
    receiptPreviewDataUrl: input.receiptPreviewDataUrl,
    receiptFileName: input.receiptFileName,
    receiptUrl: input.receiptUrl,
    receiptFileId: input.receiptFileId,
    createdAt: new Date().toISOString()
  };

  const updatedAccounts = state.accounts.map((a) =>
    a.id === account.id ? { ...a, balance: balanceAfter } : a
  );

  return {
    ...state,
    accounts: updatedAccounts,
    transactions: [tx, ...state.transactions]
  };
}

export function applyUpdateTransaction(
  state: LedgerState,
  input: UpdateTransactionInput
): LedgerState {
  const existing = state.transactions.find((t) => t.id === input.id);
  if (!existing) {
    throw new Error('Transaksi yang akan diubah tidak ditemukan.');
  }
  const targetAccount = state.accounts.find((a) => a.id === input.accountId);
  if (!targetAccount) {
    throw new Error('Rekening tujuan tidak ditemukan.');
  }
  const amount = Math.round(Math.abs(input.amount || 0));
  if (amount <= 0) {
    throw new Error('Nominal transaksi harus lebih dari Rp 0.');
  }

  // Langkah 1: kembalikan efek transaksi lama ke rekening lama
  const revertedAccounts = state.accounts.map((acc) => {
    if (acc.id !== existing.accountId) return acc;
    const reverted =
      existing.kind === 'income' ? acc.balance - existing.amount : acc.balance + existing.amount;
    return { ...acc, balance: reverted };
  });

  // Langkah 2: terapkan transaksi baru ke rekening tujuan
  const targetAfterRevert = revertedAccounts.find((a) => a.id === input.accountId)!;
  const balanceBefore = targetAfterRevert.balance;
  const balanceAfter =
    input.kind === 'income' ? balanceBefore + amount : balanceBefore - amount;

  const updatedAccounts = revertedAccounts.map((acc) =>
    acc.id === input.accountId ? { ...acc, balance: balanceAfter } : acc
  );

  const updatedTx: Transaction = {
    ...existing,
    date: input.date || existing.date,
    time: input.time || existing.time,
    kind: input.kind,
    amount,
    category: input.category.trim() || (input.kind === 'income' ? 'Pemasukan' : 'Pengeluaran'),
    note: input.note.trim(),
    accountId: targetAccount.id,
    accountName: targetAccount.name,
    balanceBefore,
    balanceAfter
  };

  return {
    ...state,
    accounts: updatedAccounts,
    transactions: state.transactions.map((t) => (t.id === input.id ? updatedTx : t))
  };
}

export function applyDeleteTransaction(state: LedgerState, txId: string): LedgerState {
  const target = state.transactions.find((t) => t.id === txId);
  if (!target) return state;

  const updatedAccounts = state.accounts.map((acc) => {
    if (acc.id !== target.accountId) return acc;
    const reverted =
      target.kind === 'income' ? acc.balance - target.amount : acc.balance + target.amount;
    return { ...acc, balance: reverted };
  });

  return {
    ...state,
    accounts: updatedAccounts,
    transactions: state.transactions.filter((t) => t.id !== txId)
  };
}

export function filterTransactions(
  transactions: Transaction[],
  filter: TransactionSearchFilter
): TransactionSearchResult {
  const q = filter.query.trim().toLowerCase();
  const digitsQuery = filter.query.replace(/[^\d]/g, '');

  const matched = transactions.filter((tx) => {
    if (filter.kind !== 'all' && tx.kind !== filter.kind) return false;
    if (filter.accountId !== 'all' && tx.accountId !== filter.accountId) return false;
    if (filter.category !== 'all' && tx.category !== filter.category) return false;
    if (filter.dateFrom && tx.date < filter.dateFrom) return false;
    if (filter.dateTo && tx.date > filter.dateTo) return false;

    if (q) {
      const hay = `${tx.note} ${tx.category} ${tx.accountName} ${tx.date}`.toLowerCase();
      const amountMatch = digitsQuery.length >= 2 && String(tx.amount).includes(digitsQuery);
      if (!hay.includes(q) && !amountMatch) return false;
    }

    return true;
  });

  const sorted = sortByDateTimeDesc(matched);
  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of sorted) {
    if (t.kind === 'income') totalIncome += t.amount;
    else totalExpense += t.amount;
  }

  return {
    items: sorted,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense
  };
}

export function previewTransferBalances(
  fromAccount: Account | undefined,
  toAccount: Account | undefined,
  amount: number,
  adminFee: number
): TransferPreview {
  if (!fromAccount || !toAccount) {
    return {
      valid: false,
      fromBefore: fromAccount?.balance ?? 0,
      fromAfter: fromAccount?.balance ?? 0,
      toBefore: toAccount?.balance ?? 0,
      toAfter: toAccount?.balance ?? 0,
      totalDeducted: 0,
      error: 'Pilih rekening sumber dan rekening tujuan.'
    };
  }

  if (fromAccount.id === toAccount.id) {
    return {
      valid: false,
      fromBefore: fromAccount.balance,
      fromAfter: fromAccount.balance,
      toBefore: toAccount.balance,
      toAfter: toAccount.balance,
      totalDeducted: 0,
      error: 'Rekening sumber dan rekening tujuan tidak boleh sama.'
    };
  }

  const cleanAmount = Math.max(0, Math.round(amount || 0));
  const cleanFee = Math.max(0, Math.round(adminFee || 0));
  const totalDeducted = cleanAmount + cleanFee;
  const fromAfter = fromAccount.balance - totalDeducted;
  const toAfter = toAccount.balance + cleanAmount;

  if (cleanAmount <= 0) {
    return {
      valid: false,
      fromBefore: fromAccount.balance,
      fromAfter: fromAccount.balance,
      toBefore: toAccount.balance,
      toAfter: toAccount.balance,
      totalDeducted,
      error: 'Masukkan nominal pemindahan lebih dari Rp 0.'
    };
  }

  if (fromAfter < 0) {
    return {
      valid: false,
      fromBefore: fromAccount.balance,
      fromAfter,
      toBefore: toAccount.balance,
      toAfter,
      totalDeducted,
      error: 'Saldo rekening sumber tidak mencukupi untuk nominal dan biaya admin.'
    };
  }

  return {
    valid: true,
    fromBefore: fromAccount.balance,
    fromAfter,
    toBefore: toAccount.balance,
    toAfter,
    totalDeducted
  };
}

export function applyAddTransfer(
  state: LedgerState,
  input: NewTransferInput,
  customId?: string
): LedgerState {
  const fromAcc = state.accounts.find((a) => a.id === input.fromAccountId);
  const toAcc = state.accounts.find((a) => a.id === input.toAccountId);
  const preview = previewTransferBalances(fromAcc, toAcc, input.amount, input.adminFee);

  if (!fromAcc || !toAcc || !preview.valid) {
    throw new Error(preview.error || 'Data pemindahan saldo belum valid.');
  }

  const amount = Math.round(input.amount);
  const adminFee = Math.max(0, Math.round(input.adminFee || 0));

  const transfer: Transfer = {
    id: customId || `trf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: input.date || getTodayIso(),
    time: input.time || getNowTime(),
    fromAccountId: fromAcc.id,
    fromAccountName: fromAcc.name,
    toAccountId: toAcc.id,
    toAccountName: toAcc.name,
    amount,
    adminFee,
    note: input.note.trim(),
    fromBalanceAfter: preview.fromAfter,
    toBalanceAfter: preview.toAfter,
    createdAt: new Date().toISOString()
  };

  const updatedAccounts = state.accounts.map((acc) => {
    if (acc.id === fromAcc.id) return { ...acc, balance: preview.fromAfter };
    if (acc.id === toAcc.id) return { ...acc, balance: preview.toAfter };
    return acc;
  });

  return {
    ...state,
    accounts: updatedAccounts,
    transfers: [transfer, ...state.transfers]
  };
}

export function computePeriodAnalytics(
  transactions: Transaction[],
  period: PeriodFilter,
  anchorDate: string,
  accountIdFilter = 'all'
): PeriodAnalyticsResult {
  const scoped =
    accountIdFilter === 'all'
      ? transactions
      : transactions.filter((t) => t.accountId === accountIdFilter);

  const monday = getMondayOfWeek(anchorDate);
  const sunday = shiftIsoDate(monday, 6);
  const monthPrefix = anchorDate.slice(0, 7); // YYYY-MM

  const sumTotals = (list: Transaction[]) => {
    let income = 0;
    let expense = 0;
    for (const t of list) {
      if (t.kind === 'income') income += t.amount;
      else expense += t.amount;
    }
    return { income, expense };
  };

  const dailyList = scoped.filter((t) => t.date === anchorDate);
  const weeklyList = scoped.filter((t) => t.date >= monday && t.date <= sunday);
  const monthlyList = scoped.filter((t) => t.date.startsWith(monthPrefix));

  const dailyTotals = sumTotals(dailyList);
  const weeklyTotals = sumTotals(weeklyList);
  const monthlyTotals = sumTotals(monthlyList);

  if (period === 'daily') {
    const slots = [
      { label: '00-08', start: '00:00', end: '08:59' },
      { label: '09-11', start: '09:00', end: '11:59' },
      { label: '12-14', start: '12:00', end: '14:59' },
      { label: '15-17', start: '15:00', end: '17:59' },
      { label: '18-23', start: '18:00', end: '23:59' }
    ];
    const buckets: ChartBucket[] = slots.map((s) => {
      const inSlot = dailyList.filter((t) => t.time >= s.start && t.time <= s.end);
      const tot = sumTotals(inSlot);
      return { label: s.label, income: tot.income, expense: tot.expense };
    });

    return {
      periodLabel: `Harian (${anchorDate})`,
      totalIncome: dailyTotals.income,
      totalExpense: dailyTotals.expense,
      netCashflow: dailyTotals.income - dailyTotals.expense,
      buckets,
      filteredTransactions: sortByDateTimeDesc(dailyList),
      crossPeriodRecap: {
        daily: dailyTotals,
        weekly: weeklyTotals,
        monthly: monthlyTotals
      }
    };
  }

  if (period === 'weekly') {
    const dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const buckets: ChartBucket[] = dayLabels.map((lbl, idx) => {
      const dIso = shiftIsoDate(monday, idx);
      const tot = sumTotals(weeklyList.filter((t) => t.date === dIso));
      return {
        label: lbl,
        income: tot.income,
        expense: tot.expense,
        isCurrent: dIso === anchorDate
      };
    });

    return {
      periodLabel: `Mingguan (${monday.slice(8, 10)} - ${sunday.slice(8, 10)}/${sunday.slice(5, 7)})`,
      totalIncome: weeklyTotals.income,
      totalExpense: weeklyTotals.expense,
      netCashflow: weeklyTotals.income - weeklyTotals.expense,
      buckets,
      filteredTransactions: sortByDateTimeDesc(weeklyList),
      crossPeriodRecap: {
        daily: dailyTotals,
        weekly: weeklyTotals,
        monthly: monthlyTotals
      }
    };
  }

  const weekRanges = [
    { label: 'Mgg 1', minDay: 1, maxDay: 7 },
    { label: 'Mgg 2', minDay: 8, maxDay: 14 },
    { label: 'Mgg 3', minDay: 15, maxDay: 21 },
    { label: 'Mgg 4', minDay: 22, maxDay: 28 },
    { label: 'Mgg 5', minDay: 29, maxDay: 31 }
  ];
  const anchorDay = Number(anchorDate.slice(8, 10)) || 1;
  const buckets: ChartBucket[] = weekRanges.map((r) => {
    const inWeek = monthlyList.filter((t) => {
      const d = Number(t.date.slice(8, 10));
      return d >= r.minDay && d <= r.maxDay;
    });
    const tot = sumTotals(inWeek);
    return {
      label: r.label,
      income: tot.income,
      expense: tot.expense,
      isCurrent: anchorDay >= r.minDay && anchorDay <= r.maxDay
    };
  });

  return {
    periodLabel: `Bulanan (${monthPrefix})`,
    totalIncome: monthlyTotals.income,
    totalExpense: monthlyTotals.expense,
    netCashflow: monthlyTotals.income - monthlyTotals.expense,
    buckets,
    filteredTransactions: sortByDateTimeDesc(monthlyList),
    crossPeriodRecap: {
      daily: dailyTotals,
      weekly: weeklyTotals,
      monthly: monthlyTotals
    }
  };
}

export function computeDailyReport(
  state: LedgerState,
  reportDate: string
): DailyReportData {
  const dayTx = state.transactions
    .filter((t) => t.date === reportDate)
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time));

  const dayTransfers = state.transfers
    .filter((tr) => tr.date === reportDate)
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time));

  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of dayTx) {
    if (t.kind === 'income') totalIncome += t.amount;
    else totalExpense += t.amount;
  }

  return {
    date: reportDate,
    totalIncome,
    totalExpense,
    netChange: totalIncome - totalExpense,
    transactions: dayTx,
    transfers: dayTransfers
  };
}

export function createSimulationDataset(today = getTodayIso()): LedgerState {
  const d1 = shiftIsoDate(today, -2);
  const d2 = shiftIsoDate(today, -1);

  const accBca: Account = {
    id: 'sim_bca',
    name: 'Rekening Utama BCA [SIMULASI]',
    type: 'bank',
    maskedNumber: 'Bank BCA • •••• 4821',
    roleTag: 'Rekening Utama',
    initialBalance: 12_000_000,
    balance: 12_165_000,
    createdAt: new Date().toISOString(),
    isSimulation: true,
    colorTheme: 'sage',
    emblem: 'bag'
  };

  const accMandiri: Account = {
    id: 'sim_mandiri',
    name: 'Tabungan Mandiri [SIMULASI]',
    type: 'bank',
    maskedNumber: 'Bank Mandiri • •••• 9104',
    roleTag: 'Dana Operasional',
    initialBalance: 3_400_000,
    balance: 4_900_000,
    createdAt: new Date().toISOString(),
    isSimulation: true,
    colorTheme: 'cream',
    emblem: 'bag'
  };

  const accCash: Account = {
    id: 'sim_cash',
    name: 'Kas Harian & QRIS [SIMULASI]',
    type: 'cash',
    maskedNumber: 'Dompet Harian',
    roleTag: 'Pengeluaran Harian',
    initialBalance: 1_475_000,
    balance: 1_250_000,
    createdAt: new Date().toISOString(),
    isSimulation: true,
    colorTheme: 'sky',
    emblem: 'bag'
  };

  const transactions: Transaction[] = [
    {
      id: 'sim_tx_3',
      date: today,
      time: '16:10',
      kind: 'expense',
      amount: 225_000,
      category: 'Perlengkapan Kerja',
      note: 'Kertas A4 & tinta cetak [SIMULASI]',
      accountId: accCash.id,
      accountName: accCash.name,
      balanceBefore: 1_475_000,
      balanceAfter: 1_250_000,
      createdAt: new Date().toISOString(),
      isSimulation: true
    },
    {
      id: 'sim_tx_2',
      date: today,
      time: '12:40',
      kind: 'expense',
      amount: 85_000,
      category: 'Konsumsi & Makan',
      note: 'Kopi tim & parkir klien [SIMULASI]',
      accountId: accBca.id,
      accountName: accBca.name,
      balanceBefore: 12_250_000,
      balanceAfter: 12_165_000,
      createdAt: new Date().toISOString(),
      isSimulation: true
    },
    {
      id: 'sim_tx_1',
      date: today,
      time: '09:15',
      kind: 'income',
      amount: 1_750_000,
      category: 'Pendapatan Proyek',
      note: 'Pelunasan invoice desain [SIMULASI]',
      accountId: accBca.id,
      accountName: accBca.name,
      balanceBefore: 10_500_000,
      balanceAfter: 12_250_000,
      createdAt: new Date().toISOString(),
      isSimulation: true
    },
    {
      id: 'sim_tx_0b',
      date: d2,
      time: '19:20',
      kind: 'expense',
      amount: 340_000,
      category: 'Belanja Harian',
      note: 'Belanja bahan dapur mingguan [SIMULASI]',
      accountId: accMandiri.id,
      accountName: accMandiri.name,
      balanceBefore: 5_240_000,
      balanceAfter: 4_900_000,
      createdAt: new Date().toISOString(),
      isSimulation: true
    },
    {
      id: 'sim_tx_0a',
      date: d1,
      time: '10:05',
      kind: 'income',
      amount: 2_500_000,
      category: 'Gaji & Upah',
      note: 'Honor konsultasi bulanan [SIMULASI]',
      accountId: accBca.id,
      accountName: accBca.name,
      balanceBefore: 9_500_000,
      balanceAfter: 12_000_000,
      createdAt: new Date().toISOString(),
      isSimulation: true
    }
  ];

  const transfers: Transfer[] = [
    {
      id: 'sim_trf_1',
      date: today,
      time: '08:30',
      fromAccountId: accBca.id,
      fromAccountName: accBca.name,
      toAccountId: accMandiri.id,
      toAccountName: accMandiri.name,
      amount: 1_500_000,
      adminFee: 0,
      note: 'Top up dana operasional [SIMULASI]',
      fromBalanceAfter: 10_500_000,
      toBalanceAfter: 5_240_000,
      createdAt: new Date().toISOString(),
      isSimulation: true
    }
  ];

  return {
    accounts: [accBca, accMandiri, accCash],
    transactions,
    transfers
  };
}

function labelForAccountType(type: AccountType): string {
  if (type === 'bank') return 'Rekening Bank';
  if (type === 'ewallet') return 'Dompet Digital';
  return 'Kas Tunai';
}

function sortByDateTimeDesc(list: Transaction[]): Transaction[] {
  return list
    .slice()
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}
