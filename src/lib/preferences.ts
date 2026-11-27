import { loadAccountVisualMap, saveAccountVisualMap } from './accountTheme';
import type {
  AccountColorTheme,
  AccountEmblemKind,
  AccountVisualSetting,
  BudgetHealthStatus,
  CategoryBudgetStatus,
  Transaction,
  TransactionKind,
  UserPreferences
} from './types';

const VALID_THEMES = new Set<AccountColorTheme>([
  'sage',
  'cream',
  'sky',
  'mint',
  'cyan',
  'sand'
]);

const VALID_EMBLEMS = new Set<AccountEmblemKind>(['bag', 'card', 'ewallet']);

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Konsumsi & Makan',
  'Belanja Harian',
  'Transportasi & BBM',
  'Tagihan & Listrik',
  'Perlengkapan Kerja',
  'Kesehatan',
  'Lainnya'
];

export const DEFAULT_INCOME_CATEGORIES = [
  'Gaji & Upah',
  'Pendapatan Proyek',
  'Hasil Usaha',
  'Pengembalian Dana',
  'Lainnya'
];

const STORAGE_PREFS_KEY = 'kaspresisi_preferences_v1';

export function createDefaultPreferences(): UserPreferences {
  return {
    customExpenseCategories: [],
    customIncomeCategories: [],
    monthlyBudgets: {},
    budgetWarningThresholdPct: 80,
    accountVisuals: {}
  };
}

export function normalizeAccountVisuals(
  raw: unknown
): Record<string, AccountVisualSetting> {
  const clean: Record<string, AccountVisualSetting> = {};
  if (!raw || typeof raw !== 'object') return clean;
  for (const [accId, val] of Object.entries(raw as Record<string, unknown>)) {
    const id = String(accId || '').trim();
    if (!id || !val || typeof val !== 'object') continue;
    const obj = val as Record<string, unknown>;
    const entry: AccountVisualSetting = {};
    if (typeof obj.colorTheme === 'string' && VALID_THEMES.has(obj.colorTheme as AccountColorTheme)) {
      entry.colorTheme = obj.colorTheme as AccountColorTheme;
    }
    if (typeof obj.emblem === 'string' && VALID_EMBLEMS.has(obj.emblem as AccountEmblemKind)) {
      entry.emblem = obj.emblem as AccountEmblemKind;
    }
    if (entry.colorTheme || entry.emblem) {
      clean[id] = entry;
    }
  }
  return clean;
}

export function normalizePreferences(raw?: Partial<UserPreferences> | null): UserPreferences {
  const defaults = createDefaultPreferences();
  if (!raw || typeof raw !== 'object') return defaults;

  const cleanList = (arr: unknown): string[] => {
    if (!Array.isArray(arr)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of arr) {
      const s = String(item || '').trim();
      if (s && !seen.has(s.toLowerCase())) {
        seen.add(s.toLowerCase());
        out.push(s);
      }
    }
    return out;
  };

  const cleanBudgets: Record<string, number> = {};
  if (raw.monthlyBudgets && typeof raw.monthlyBudgets === 'object') {
    for (const [k, v] of Object.entries(raw.monthlyBudgets)) {
      const name = String(k).trim();
      const limit = Math.round(Number(v) || 0);
      if (name && limit > 0) {
        cleanBudgets[name] = limit;
      }
    }
  }

  const threshold = Number(raw.budgetWarningThresholdPct);
  const validThreshold =
    Number.isFinite(threshold) && threshold >= 50 && threshold <= 99 ? Math.round(threshold) : 80;

  return {
    customExpenseCategories: cleanList(raw.customExpenseCategories),
    customIncomeCategories: cleanList(raw.customIncomeCategories),
    monthlyBudgets: cleanBudgets,
    budgetWarningThresholdPct: validThreshold,
    accountVisuals: normalizeAccountVisuals(raw.accountVisuals)
  };
}

export function loadUserPreferences(): UserPreferences {
  const legacyVisuals = normalizeAccountVisuals(loadAccountVisualMap());
  try {
    const raw = localStorage.getItem(STORAGE_PREFS_KEY);
    if (!raw) {
      return {
        ...createDefaultPreferences(),
        accountVisuals: legacyVisuals
      };
    }
    const normalized = normalizePreferences(JSON.parse(raw) as Partial<UserPreferences>);
    return {
      ...normalized,
      accountVisuals: {
        ...legacyVisuals,
        ...normalized.accountVisuals
      }
    };
  } catch {
    return {
      ...createDefaultPreferences(),
      accountVisuals: legacyVisuals
    };
  }
}

export function saveUserPreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs));
    saveAccountVisualMap(prefs.accountVisuals);
  } catch {
    // Abaikan jika localStorage penuh
  }
}

export function updateAccountVisualPreference(
  prefs: UserPreferences,
  accountId: string,
  patch: AccountVisualSetting
): UserPreferences {
  const id = accountId.trim();
  if (!id) return prefs;
  const current = prefs.accountVisuals[id] || {};
  return {
    ...prefs,
    accountVisuals: {
      ...prefs.accountVisuals,
      [id]: {
        ...current,
        ...patch
      }
    }
  };
}

export function removeAccountVisualPreference(
  prefs: UserPreferences,
  accountId: string
): UserPreferences {
  if (!prefs.accountVisuals[accountId]) return prefs;
  const nextVisuals = { ...prefs.accountVisuals };
  delete nextVisuals[accountId];
  return {
    ...prefs,
    accountVisuals: nextVisuals
  };
}

export function getCategoriesForKind(
  prefs: UserPreferences,
  kind: TransactionKind
): string[] {
  const base = kind === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
  const custom =
    kind === 'expense' ? prefs.customExpenseCategories : prefs.customIncomeCategories;

  const merged: string[] = [];
  const seen = new Set<string>();

  for (const c of [...base.filter((x) => x !== 'Lainnya'), ...custom, 'Lainnya']) {
    const key = c.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(c);
    }
  }
  return merged;
}

export function getAllKnownCategories(
  prefs: UserPreferences,
  transactions: Transaction[]
): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  const sources = [
    ...getCategoriesForKind(prefs, 'expense'),
    ...getCategoriesForKind(prefs, 'income'),
    ...transactions.map((t) => t.category)
  ];

  for (const item of sources) {
    const clean = item.trim();
    if (clean && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      merged.push(clean);
    }
  }
  return merged;
}

export function addCustomCategory(
  prefs: UserPreferences,
  kind: TransactionKind,
  rawName: string
): UserPreferences {
  const name = rawName.trim();
  if (!name) {
    throw new Error('Nama kategori tidak boleh kosong.');
  }
  const existing = getCategoriesForKind(prefs, kind);
  if (existing.some((c) => c.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Kategori "${name}" sudah tersedia.`);
  }

  if (kind === 'expense') {
    return {
      ...prefs,
      customExpenseCategories: [...prefs.customExpenseCategories, name]
    };
  }
  return {
    ...prefs,
    customIncomeCategories: [...prefs.customIncomeCategories, name]
  };
}

export function removeCustomCategory(
  prefs: UserPreferences,
  kind: TransactionKind,
  name: string
): UserPreferences {
  const target = name.toLowerCase();
  if (kind === 'expense') {
    const nextBudgets = { ...prefs.monthlyBudgets };
    delete nextBudgets[name];
    return {
      ...prefs,
      customExpenseCategories: prefs.customExpenseCategories.filter(
        (c) => c.toLowerCase() !== target
      ),
      monthlyBudgets: nextBudgets
    };
  }
  return {
    ...prefs,
    customIncomeCategories: prefs.customIncomeCategories.filter(
      (c) => c.toLowerCase() !== target
    )
  };
}

export function setCategoryBudget(
  prefs: UserPreferences,
  category: string,
  limit: number
): UserPreferences {
  const cleanCategory = category.trim();
  if (!cleanCategory) return prefs;

  const cleanLimit = Math.round(limit || 0);
  const nextBudgets = { ...prefs.monthlyBudgets };
  if (cleanLimit <= 0) {
    delete nextBudgets[cleanCategory];
  } else {
    nextBudgets[cleanCategory] = cleanLimit;
  }

  return {
    ...prefs,
    monthlyBudgets: nextBudgets
  };
}

export function computeMonthlyBudgetStatuses(
  transactions: Transaction[],
  prefs: UserPreferences,
  monthPrefix: string // YYYY-MM
): CategoryBudgetStatus[] {
  const spentByCategory = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.kind !== 'expense') continue;
    if (!tx.date.startsWith(monthPrefix)) continue;
    spentByCategory.set(tx.category, (spentByCategory.get(tx.category) || 0) + tx.amount);
  }

  const statuses: CategoryBudgetStatus[] = [];

  for (const [category, limit] of Object.entries(prefs.monthlyBudgets)) {
    if (limit <= 0) continue;
    const spent = spentByCategory.get(category) || 0;
    const remaining = limit - spent;
    const percent = Math.round((spent / limit) * 100);

    let status: BudgetHealthStatus = 'safe';
    if (spent >= limit) {
      status = 'exceeded';
    } else if (percent >= prefs.budgetWarningThresholdPct) {
      status = 'warning';
    }

    statuses.push({
      category,
      limit,
      spent,
      remaining,
      percent,
      status
    });
  }

  return statuses.sort((a, b) => b.percent - a.percent);
}

export function previewBudgetImpact(
  transactions: Transaction[],
  prefs: UserPreferences,
  category: string,
  monthPrefix: string,
  additionalAmount: number,
  excludeTxId?: string
): CategoryBudgetStatus | null {
  const limit = prefs.monthlyBudgets[category];
  if (!limit || limit <= 0) return null;

  let currentSpent = 0;
  for (const tx of transactions) {
    if (tx.id === excludeTxId) continue;
    if (tx.kind !== 'expense') continue;
    if (tx.category !== category) continue;
    if (!tx.date.startsWith(monthPrefix)) continue;
    currentSpent += tx.amount;
  }

  const projectedSpent = currentSpent + Math.max(0, Math.round(additionalAmount || 0));
  const remaining = limit - projectedSpent;
  const percent = Math.round((projectedSpent / limit) * 100);

  let status: BudgetHealthStatus = 'safe';
  if (projectedSpent >= limit) {
    status = 'exceeded';
  } else if (percent >= prefs.budgetWarningThresholdPct) {
    status = 'warning';
  }

  return {
    category,
    limit,
    spent: projectedSpent,
    remaining,
    percent,
    status
  };
}
