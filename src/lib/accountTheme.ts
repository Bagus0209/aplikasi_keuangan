import type { Account, AccountColorTheme, AccountEmblemKind } from './types';

export interface AccountCardThemeStyle {
  key: AccountColorTheme;
  label: string;
  bgClass: string;
  borderClass: string;
  titleClass: string;
  amountClass: string;
  subClass: string;
  watermarkClass: string;
  isDark: boolean;
  swatchHex: string;
}

export const ACCOUNT_CARD_THEMES: Record<AccountColorTheme, AccountCardThemeStyle> = {
  sage: {
    key: 'sage',
    label: 'Hijau Sage',
    bgClass: 'bg-[#4E6D5A]',
    borderClass: 'border-[#44604F]',
    titleClass: 'text-white',
    amountClass: 'text-white',
    subClass: 'text-[#E2ECE6]',
    watermarkClass: 'text-white/25',
    isDark: true,
    swatchHex: '#4E6D5A'
  },
  cream: {
    key: 'cream',
    label: 'Krem Hangat',
    bgClass: 'bg-[#F7F6F0]',
    borderClass: 'border-[#E9E7DD]',
    titleClass: 'text-[#4B5563]',
    amountClass: 'text-[#0B1220]',
    subClass: 'text-[#4B5563]',
    watermarkClass: 'text-[#0B1220]/20',
    isDark: false,
    swatchHex: '#F7F6F0'
  },
  sky: {
    key: 'sky',
    label: 'Biru Es',
    bgClass: 'bg-[#E6F6FA]',
    borderClass: 'border-[#D2ECF2]',
    titleClass: 'text-[#4B5563]',
    amountClass: 'text-[#0B1220]',
    subClass: 'text-[#4B5563]',
    watermarkClass: 'text-[#0B1220]/20',
    isDark: false,
    swatchHex: '#E6F6FA'
  },
  mint: {
    key: 'mint',
    label: 'Hijau Mint',
    bgClass: 'bg-[#E5F6E0]',
    borderClass: 'border-[#D0ECC8]',
    titleClass: 'text-[#4B5563]',
    amountClass: 'text-[#0B1220]',
    subClass: 'text-[#4B5563]',
    watermarkClass: 'text-[#0B1220]/20',
    isDark: false,
    swatchHex: '#E5F6E0'
  },
  cyan: {
    key: 'cyan',
    label: 'Biru Cerah',
    bgClass: 'bg-[#0083A8]',
    borderClass: 'border-[#007091]',
    titleClass: 'text-white',
    amountClass: 'text-white',
    subClass: 'text-[#E0F7FE]',
    watermarkClass: 'text-white/25',
    isDark: true,
    swatchHex: '#0083A8'
  },
  sand: {
    key: 'sand',
    label: 'Pasir Lembut',
    bgClass: 'bg-[#F5F2EB]',
    borderClass: 'border-[#E6E1D6]',
    titleClass: 'text-[#4B5563]',
    amountClass: 'text-[#0B1220]',
    subClass: 'text-[#4B5563]',
    watermarkClass: 'text-[#0B1220]/20',
    isDark: false,
    swatchHex: '#F5F2EB'
  }
};

const ORDERED_THEMES: AccountColorTheme[] = [
  'sage',
  'cream',
  'sky',
  'mint',
  'cyan',
  'sand'
];

const STYLES_STORAGE_KEY = 'kaspresisi_account_styles_v1';

export interface StoredAccountVisual {
  colorTheme?: AccountColorTheme;
  emblem?: AccountEmblemKind;
}

export function loadAccountVisualMap(): Record<string, StoredAccountVisual> {
  try {
    const raw = localStorage.getItem(STYLES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, StoredAccountVisual>;
  } catch {
    return {};
  }
}

export function saveAccountVisual(
  accountId: string,
  visual: StoredAccountVisual
): Record<string, StoredAccountVisual> {
  const current = loadAccountVisualMap();
  const next = {
    ...current,
    [accountId]: { ...current[accountId], ...visual }
  };
  try {
    localStorage.setItem(STYLES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Abaikan jika storage terbatas
  }
  return next;
}

export function resolveAccountVisual(
  account: Account,
  index: number,
  visualMap: Record<string, StoredAccountVisual>
): { theme: AccountCardThemeStyle; emblem: AccountEmblemKind } {
  const stored = visualMap[account.id];
  const fallbackThemeKey: AccountColorTheme =
    account.type === 'ewallet' && !account.colorTheme && !stored?.colorTheme
      ? 'cyan'
      : ORDERED_THEMES[index % ORDERED_THEMES.length];

  const themeKey = stored?.colorTheme || account.colorTheme || fallbackThemeKey;
  const theme = ACCOUNT_CARD_THEMES[themeKey] || ACCOUNT_CARD_THEMES.cream;

  const fallbackEmblem: AccountEmblemKind =
    account.type === 'ewallet'
      ? 'ewallet'
      : account.type === 'cash'
        ? 'card'
        : index % 2 === 1 && themeKey === 'mint'
          ? 'card'
          : 'bag';

  const emblem = stored?.emblem || account.emblem || fallbackEmblem;
  return { theme, emblem };
}
