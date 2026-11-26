import { formatRupiah, formatTanggalIndo } from './format';
import type { DailyReportData } from './ledger';

export async function exportDailyReportPdf(report: DailyReportData): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const tanggalLabel = formatTanggalIndo(report.date, true);

  // Header blok gelap Clean Precision Banking
  doc.setFillColor(11, 18, 32);
  doc.rect(14, 14, 182, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('LAPORAN HARIAN PEMASUKAN & PENGELUARAN', 20, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(`Tanggal Laporan: ${tanggalLabel}`, 20, 33);
  doc.text(`Dicetak dari aplikasi pribadi KasPresisi`, 20, 39);

  // Kartu Ringkasan 3 Kolom
  doc.setDrawColor(207, 216, 227);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 50, 58, 22, 2, 2, 'FD');
  doc.roundedRect(76, 50, 58, 22, 2, 2, 'FD');
  doc.roundedRect(138, 50, 58, 22, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Total Pemasukan', 18, 57);
  doc.text('Total Pengeluaran', 80, 57);
  doc.text('Selisih Kas Bersih', 142, 57);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(13, 104, 72);
  doc.text(formatRupiah(report.totalIncome, true), 18, 66);

  doc.setTextColor(159, 29, 44);
  doc.text(formatRupiah(-report.totalExpense), 80, 66);

  doc.setTextColor(11, 18, 32);
  doc.text(formatRupiah(report.netChange, true), 142, 66);

  // Tabel Rincian Transaksi
  const txRows =
    report.transactions.length > 0
      ? report.transactions.map((t, idx) => [
          String(idx + 1),
          t.time,
          t.kind === 'income' ? 'Masuk (+)' : 'Keluar (-)',
          t.category,
          t.accountName,
          t.note || '-',
          t.receiptUrl
            ? 'Ada (Drive)'
            : t.receiptPreviewDataUrl
              ? 'Ada (Lokal)'
              : '-',
          t.kind === 'income' ? formatRupiah(t.amount, true) : formatRupiah(-t.amount)
        ])
      : [['-', '-', '-', 'Tidak ada transaksi pada tanggal ini', '-', '-', '-', 'Rp 0']];

  autoTable(doc, {
    startY: 78,
    head: [['No', 'Jam', 'Jenis', 'Kategori', 'Rekening', 'Catatan', 'Bukti', 'Nominal']],
    body: txRows,
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [11, 18, 32]
    },
    headStyles: {
      fillColor: [15, 76, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      7: { halign: 'right', fontStyle: 'bold' }
    }
  });

  // Tabel Mutasi Pindah Saldo Antar Rekening (jika ada pada tanggal tersebut)
  if (report.transfers.length > 0) {
    const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 120;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(11, 18, 32);
    doc.text('Catatan Pemindahan Saldo Antar Rekening (Tidak Dihitung Pengeluaran)', 14, finalY + 10);

    autoTable(doc, {
      startY: finalY + 14,
      head: [['Jam', 'Dari Rekening', 'Ke Rekening', 'Catatan', 'Biaya Admin', 'Nominal Pindah']],
      body: report.transfers.map((tr) => [
        tr.time,
        tr.fromAccountName,
        tr.toAccountName,
        tr.note || '-',
        formatRupiah(tr.adminFee),
        formatRupiah(tr.amount)
      ]),
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255] },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' }
      }
    });
  }

  doc.save(`Laporan_Harian_${report.date}.pdf`);
}

export function exportDailyReportCsv(report: DailyReportData): void {
  const headers = [
    'Tanggal',
    'Jam',
    'Jenis',
    'Kategori',
    'Rekening',
    'Catatan',
    'Nominal_Masuk',
    'Nominal_Keluar',
    'Link_Bukti_Struk'
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.join(',')];
  for (const t of report.transactions) {
    lines.push(
      [
        t.date,
        t.time,
        t.kind === 'income' ? 'Pemasukan' : 'Pengeluaran',
        t.category,
        t.accountName,
        t.note,
        t.kind === 'income' ? t.amount : 0,
        t.kind === 'expense' ? t.amount : 0,
        t.receiptUrl || (t.receiptFileName ? `[Lokal: ${t.receiptFileName}]` : '')
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  lines.push('');
  lines.push(
    ['TOTAL HARIAN', '', '', '', '', '', report.totalIncome, report.totalExpense, '']
      .map(escapeCsv)
      .join(',')
  );

  // Tambah BOM UTF-8 supaya Excel langsung membuka kolom dengan rapi
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Laporan_Harian_${report.date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildDailyShareText(report: DailyReportData): string {
  const lines = [
    `LAPORAN KEUANGAN HARIAN (${formatTanggalIndo(report.date, true)})`,
    `Total Masuk: ${formatRupiah(report.totalIncome, true)}`,
    `Total Keluar: ${formatRupiah(-report.totalExpense)}`,
    `Selisih Bersih: ${formatRupiah(report.netChange, true)}`,
    ''
  ];

  if (report.transactions.length === 0) {
    lines.push('Belum ada transaksi pemasukan/pengeluaran pada tanggal ini.');
  } else {
    lines.push('Rincian Transaksi:');
    for (const t of report.transactions) {
      const amt = t.kind === 'income' ? formatRupiah(t.amount, true) : formatRupiah(-t.amount);
      lines.push(`• ${t.time} [${t.accountName}] ${t.category}: ${amt}${t.note ? ` (${t.note})` : ''}`);
    }
  }

  if (report.transfers.length > 0) {
    lines.push('');
    lines.push('Mutasi Antar Rekening:');
    for (const tr of report.transfers) {
      lines.push(
        `• ${tr.time} ${tr.fromAccountName} -> ${tr.toAccountName}: ${formatRupiah(tr.amount)}`
      );
    }
  }

  return lines.join('\n');
}
