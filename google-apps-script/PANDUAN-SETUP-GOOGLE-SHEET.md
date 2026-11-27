# Panduan Menghubungkan Aplikasi ke Google Sheet & Google Drive Pribadi (5 Menit)

Seluruh data rekening, catatan pemasukan/pengeluaran, mutasi antar rekening, serta foto struk tersimpan 100% di akun Google pribadi Anda tanpa biaya bulanan.

---

## Langkah 1: Buat File Google Sheet Baru
1. Buka [sheets.new](https://sheets.new) di peramban laptop menggunakan akun Google pribadi Anda.
2. Beri judul sesuka Anda, misalnya **`Keuangan Pribadi - KasPresisi`**.

## Langkah 2: Pasang Skrip Penghubung (`Code.gs`)
1. Di menu bagian atas Google Sheet, klik **Extensions (Ekstensi) > Apps Script**.
2. Hapus kode kosong `function myFunction() {}` yang ada di layar editor.
3. Buka file [Code.gs](./Code.gs), salin seluruh isinya, lalu tempelkan ke editor Apps Script.
4. Pada baris `const DEFAULT_SECRET_PIN = "123456";`, ganti angka `"123456"` menjadi **PIN atau kata sandi rahasia pilihan Anda** (contoh: `"berkah2026"`).
5. Klik ikon **Save (Simpan / Ctrl+S)**.

## Langkah 3: Jalankan Inisialisasi Otomatis (`setupDatabase`)
1. Pada bilah atas Apps Script (di sebelah tombol **Run**), pastikan dropdown fungsi terpilih pada **`setupDatabase`**.
2. Klik tombol **Run (Jalankan)**.
3. Akan muncul jendela permintaan izin Google (*Authorization required*):
   - Klik **Review permissions** > pilih akun Google Anda sendiri.
   - Jika muncul peringatan *Google hasn't verified this app* (wajar karena ini skrip pribadi Anda sendiri), klik **Advanced (Lanjutan)** di kiri bawah, lalu klik **Go to Untitled project (unsafe)** > klik **Allow (Izinkan)**.
4. Kembali ke tab Google Sheet Anda: Anda akan melihat 4 tab otomatis terbentuk rapi (`Rekening`, `Transaksi`, `Transfer`, dan `Pengaturan`), serta sebuah folder bernama **`KasPresisi - Bukti Struk Keuangan`** otomatis dibuat di Google Drive Anda!

## Langkah 4: Terbitkan sebagai Web App URL
1. Di pojok kanan atas halaman Apps Script, klik tombol biru **Deploy > New deployment**.
2. Klik ikon roda gigi di sebelah *Select type*, lalu pilih **Web app**.
3. Isi pengaturan berikut:
   - **Description:** `KasPresisi API v1`
   - **Execute as:** `Me` (email Google Anda)
   - **Who has access:** **`Anyone`** *(Penting agar peramban HP Anda bisa mengirim data tanpa terblokir halaman login HTML; keamanan tetap dikunci oleh `SECRET_PIN` Anda).*
4. Klik **Deploy**, lalu salin **Web app URL** yang berakhiran `/exec` (contoh: `https://script.google.com/macros/s/AKfycb.../exec`).

## Langkah 5: Sambungkan di Aplikasi HP Anda
1. Buka aplikasi **KasPresisi** di HP Anda, lalu ketuk tombol **Google Sheet** di pojok kanan atas.
2. Tempelkan **Web app URL** dan masukkan **PIN Rahasia** yang Anda buat pada Langkah 2.
3. Ketuk **Tes & Hubungkan Google Sheet**.
4. Untuk memasang aplikasi ke Layar Utama HP:
   - **Android (Chrome):** Ketuk menu titik tiga di pojok kanan atas > pilih **Tambahkan ke layar utama (Install app / Add to Home screen)**.
   - **iPhone (Safari):** Ketuk tombol **Share (Bagikan)** di bawah > pilih **Add to Home Screen**.

---

## Cara Memperbarui `Code.gs` (Jika Sudah Pernah Deploy Sebelumnya)
Agar fitur **Edit Rekening**, **Edit Transaksi**, serta sinkronisasi **Kategori Kustom & Anggaran Bulanan** ikut tersimpan ke Google Sheet (tanpa mengubah Web App URL yang sudah terpasang di HP Anda):
1. Buka Google Sheet Anda > klik **Extensions > Apps Script**.
2. Ganti seluruh isi `Code.gs` dengan versi terbaru dari [Code.gs](./Code.gs) (pastikan `DEFAULT_SECRET_PIN` tetap sama jika belum tersimpan di tab `Pengaturan`, lalu tekan **Ctrl+S**).
3. Klik **Deploy > Manage deployments** > klik ikon pensil (**Edit**) pada deployment aktif > pada kolom *Version* pilih **New version** > klik **Deploy**.
4. Selesai! Web App URL tetap sama, tidak perlu menyambungkan ulang di HP.
