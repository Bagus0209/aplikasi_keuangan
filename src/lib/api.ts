import type { Account, LedgerState, SyncConfig, Transaction, Transfer } from './types';

const STORAGE_LEDGER_KEY = 'kaspresisi_ledger_v1';
const STORAGE_CONFIG_KEY = 'kaspresisi_sync_config_v1';

export function loadLocalLedger(): LedgerState {
  try {
    const raw = localStorage.getItem(STORAGE_LEDGER_KEY);
    if (!raw) return { accounts: [], transactions: [], transfers: [] };
    const parsed = JSON.parse(raw) as Partial<LedgerState>;
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      transfers: Array.isArray(parsed.transfers) ? parsed.transfers : []
    };
  } catch {
    return { accounts: [], transactions: [], transfers: [] };
  }
}

export function saveLocalLedger(state: LedgerState): void {
  try {
    localStorage.setItem(STORAGE_LEDGER_KEY, JSON.stringify(state));
  } catch {
    // Abaikan bila kuota localStorage penuh oleh gambar besar
  }
}

export function loadSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (!raw) return { scriptUrl: '', secretPin: '' };
    const parsed = JSON.parse(raw) as Partial<SyncConfig>;
    return {
      scriptUrl: parsed.scriptUrl || '',
      secretPin: parsed.secretPin || '',
      spreadsheetName: parsed.spreadsheetName,
      spreadsheetUrl: parsed.spreadsheetUrl,
      lastSyncedAt: parsed.lastSyncedAt
    };
  } catch {
    return { scriptUrl: '', secretPin: '' };
  }
}

export function saveSyncConfig(config: SyncConfig): void {
  localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
}

export function isCloudConfigured(config: SyncConfig): boolean {
  return Boolean(config.scriptUrl.trim() && config.secretPin.trim());
}

interface AppsScriptResponse {
  ok: boolean;
  error?: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  accounts?: Account[];
  transactions?: Transaction[];
  transfers?: Transfer[];
}

/**
 * Mengirim POST menggunakan Content-Type: text/plain;charset=utf-8
 * agar bebas preflight OPTIONS CORS pada Google Apps Script di HP Android & iPhone.
 */
async function callAppsScript(
  config: SyncConfig,
  action: string,
  payload?: Record<string, unknown>
): Promise<AppsScriptResponse> {
  const url = config.scriptUrl.trim();
  if (!url.startsWith('https://script.google.com/')) {
    throw new Error(
      'URL harus berupa Web App Google Apps Script yang diawali https://script.google.com/...'
    );
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({
      token: config.secretPin.trim(),
      action,
      payload: payload || {}
    })
  });

  if (!response.ok) {
    throw new Error(`Server Google Sheet merespons status HTTP ${response.status}.`);
  }

  const data = (await response.json()) as AppsScriptResponse;
  if (!data.ok) {
    throw new Error(data.error || 'Permintaan ditolak oleh Google Apps Script.');
  }
  return data;
}

export async function syncFromGoogleSheet(config: SyncConfig): Promise<{
  ledger: LedgerState;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
}> {
  const res = await callAppsScript(config, 'syncAll');
  return {
    ledger: {
      accounts: res.accounts || [],
      transactions: res.transactions || [],
      transfers: res.transfers || []
    },
    spreadsheetName: res.spreadsheetName,
    spreadsheetUrl: res.spreadsheetUrl
  };
}

export async function pushActionToGoogleSheet(
  config: SyncConfig,
  action: 'addAccount' | 'deleteAccount' | 'addTransaction' | 'deleteTransaction' | 'addTransfer',
  payload: Record<string, unknown>
): Promise<LedgerState> {
  const res = await callAppsScript(config, action, payload);
  return {
    accounts: res.accounts || [],
    transactions: res.transactions || [],
    transfers: res.transfers || []
  };
}
