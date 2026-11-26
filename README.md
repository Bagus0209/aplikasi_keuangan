# KasPresisi - Aplikasi PWA Pencatat Keuangan Pribadi

Aplikasi mobile pencatat keuangan pribadi multi-rekening bergaya **Clean Precision Banking** yang dapat dipasang ke Layar Utama HP (Android & iPhone) serta tersambung gratis ke **Google Sheet** dan **Google Drive** pribadi Anda.

## Fitur Utama
1. **Multi-Rekening:** Tambah banyak rekening (Bank, E-Wallet, Kas Tunai) dan pantau total saldo gabungan.
2. **Upload Gambar Bukti & Konversi Saldo:** Ambil foto struk langsung dari kamera HP (dikompresi otomatis ke JPEG ~150 KB), simpan ke Google Drive pribadi, dan perbarui saldo rekening secara otomatis (`+` pemasukan / `-` pengeluaran).
3. **Data Harian, Mingguan, dan Bulanan:** Grafik perbandingan arus kas masuk vs keluar, filter per rekening, dan rekap lintas periode.
4. **Pindah Saldo Antar Rekening:** Catat mutasi dari rekening sumber ke rekening tujuan beserta opsi biaya admin bank tanpa mengotori angka pengeluaran harian.
5. **Laporan Harian (PDF & CSV):** Buat dan unduh laporan pemasukan/pengeluaran harian dalam bentuk file PDF siap cetak, tabel CSV/Excel, atau salin teks ringkasan.

## Cara Menjalankan di Komputer / Wi-Fi Lokal
```powershell
Set-Location "D:\aplikasi_keuangan"
npm run dev
```
Untuk mencoba langsung di HP yang satu Wi-Fi, buka alamat `Network: http://192.168.x.x:5173` yang tampil di terminal.

## Cara Menghubungkan ke Google Sheet Pribadi
Ikuti langkah 5 menit pada [google-apps-script/PANDUAN-SETUP-GOOGLE-SHEET.md](./google-apps-script/PANDUAN-SETUP-GOOGLE-SHEET.md).

## Cara Deploy Online Gratis (Agar Bisa Diakses Pakai Paket Data HP)
- **Opsi A (Vercel):** Buat repositori GitHub dari folder ini atau unggah folder ke [vercel.com](https://vercel.com), lalu klik **Deploy**.
- **Opsi B (GitHub Pages):** Push ke branch `main` di GitHub, buka **Settings > Pages > Source: GitHub Actions**. Workflow pada `.github/workflows/deploy.yml` akan otomatis mempublikasikan PWA Anda dengan HTTPS.
