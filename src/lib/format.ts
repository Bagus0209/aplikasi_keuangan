const idrFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0
});

export function formatRupiah(amount: number, showPlus = false): string {
  const abs = Math.round(Math.abs(amount));
  const formatted = `Rp ${idrFormatter.format(abs)}`;
  if (amount < 0) return `-${formatted}`;
  if (showPlus && amount > 0) return `+${formatted}`;
  return formatted;
}

export function formatRupiahCompact(amount: number, showSign = false): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : showSign && amount > 0 ? '+' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(2).replace('.', ',')}M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(2).replace('.', ',')}jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${Math.round(abs / 1_000)}rb`;
  }
  return `${sign}Rp ${Math.round(abs)}`;
}

export function parseDigitsToNumber(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return 0;
  return Number(digits);
}

export function formatNumberInput(value: number): string {
  if (!value || value <= 0) return '';
  return idrFormatter.format(Math.round(value));
}

export function getTodayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getNowTime(now = new Date()): string {
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
  return getTodayIso(dt);
}

const HARI_INDO = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_PENDEK = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des'
];

export function formatTanggalIndo(isoDate: string, includeDayName = true): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(y, m - 1, d);
  const dayName = HARI_INDO[dt.getDay()];
  const monthName = BULAN_PENDEK[m - 1] || '';
  return includeDayName ? `${dayName}, ${d} ${monthName} ${y}` : `${d} ${monthName} ${y}`;
}

export function getMondayOfWeek(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0 = Sun, 1 = Mon
  const diffToMon = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diffToMon);
  return getTodayIso(dt);
}
