export type AccountType = 'bank' | 'ewallet' | 'cash';

export type AccountColorTheme =
  | 'sage'
  | 'cream'
  | 'sky'
  | 'mint'
  | 'cyan'
  | 'sand';

export type AccountEmblemKind = 'bag' | 'card' | 'ewallet';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  maskedNumber: string;
  roleTag: string;
  initialBalance: number;
  balance: number;
  createdAt: string;
  isSimulation?: boolean;
  colorTheme?: AccountColorTheme;
  emblem?: AccountEmblemKind;
}

export type TransactionKind = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  kind: TransactionKind;
  amount: number;
  category: string;
  note: string;
  accountId: string;
  accountName: string;
  balanceBefore: number;
  balanceAfter: number;
  receiptFileId?: string;
  receiptUrl?: string;
  receiptPreviewDataUrl?: string;
  receiptFileName?: string;
  createdAt: string;
  pendingSync?: boolean;
  isSimulation?: boolean;
}

export interface Transfer {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  adminFee: number;
  note: string;
  fromBalanceAfter: number;
  toBalanceAfter: number;
  createdAt: string;
  pendingSync?: boolean;
  isSimulation?: boolean;
}

export type PeriodFilter = 'daily' | 'weekly' | 'monthly';

export type ActiveTab = 'accounts' | 'record' | 'analytics' | 'transfer' | 'report';

export interface SyncConfig {
  scriptUrl: string;
  secretPin: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  lastSyncedAt?: string;
}

export interface LedgerState {
  accounts: Account[];
  transactions: Transaction[];
  transfers: Transfer[];
}
