# Panduan Deploy — Travelink Makassar Management

Ditulis untuk dikerjakan sendiri tanpa perlu paham koding. Perkiraan waktu total 40–60 menit.
Kerjakan berurutan dari A sampai E.

---

## A. Jalankan dulu di komputer (10 menit)

Tujuannya memastikan aplikasi hidup sebelum diunggah ke internet.

1. Buka folder `travelink_webapp` di File Explorer.
2. Klik kolom alamat di atas, ketik `cmd`, tekan Enter. Jendela hitam Command Prompt terbuka di folder itu.
3. Ketik lalu Enter:
   ```
   npm install
   ```
   Tunggu sampai selesai, sekitar 2–4 menit. Ada tulisan warning, itu wajar.
4. Ketik lalu Enter:
   ```
   npm run dev
   ```
5. Muncul alamat `http://localhost:5173`. Tahan Ctrl lalu klik alamat itu, atau salin ke browser.
6. Masuk dengan username `owner` dan PIN `AliImran27`.

Kalau halaman terbuka dan menu terlihat, lanjut ke B. Untuk menghentikan, tekan Ctrl+C di Command Prompt.

---

## B. Aktifkan Firestore, Anonymous, dan Storage (10 menit)

Project Firebase `travelink-makassar-management` sudah ada. Tinggal tiga penyetelan.

### B1. Firestore

1. Buka https://console.firebase.google.com, pilih project **travelink-makassar-management**.
2. Menu kiri → **Build → Firestore Database**. Kalau belum ada, klik **Create database**, pilih **Start in test mode**, lokasi **asia-southeast2 (Jakarta)**.
3. Masuk tab **Rules**, hapus isinya, tempel ini, lalu **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

> Test mode otomatis mati setelah 30 hari dan aplikasi akan berhenti membaca data.
> Aturan di atas menggantikannya, jadi jangan dilewati.

### B2. Anonymous sign-in

1. Menu kiri → **Build → Authentication → Get started**.
2. Tab **Sign-in method** → pilih **Anonymous** → geser **Enable** → **Save**.

Tanpa langkah ini, aturan di B1 akan menolak semua akses dan aplikasi tampil kosong.

### B3. Storage untuk logo

1. Menu kiri → **Build → Storage → Get started**, ikuti sampai selesai.
2. Tab **Rules**, tempel ini, lalu **Publish**:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /travelink/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Kalau Storage minta upgrade paket berbayar, lewati saja bagian B3. Semua fitur lain tetap jalan,
hanya unggah logo yang tidak bisa dipakai.

---

## C. Unggah ke GitHub (10 menit)

Repo sudah ada: https://github.com/alyimran27/travelink_webapp

1. Buka repo itu di browser, pastikan sudah login sebagai `alyimran27`.
2. Klik **Add file → Upload files**.
3. Buka folder `travelink_webapp` di komputer. Pilih semua isinya **kecuali** folder `node_modules`
   (folder itu besar dan tidak perlu diunggah).
   - Cara cepat: klik file pertama, tahan Ctrl sambil mengklik yang lain, atau blok semua lalu Ctrl+klik `node_modules` untuk membatalkannya.
4. Seret semuanya ke jendela GitHub. Folder `src` ikut terbawa beserta isinya.
5. Di kotak bawah tulis `versi pertama`, klik **Commit changes**.

Pastikan setelah selesai, di GitHub terlihat folder `src`, file `package.json`, dan `index.html`.

---

## D. Deploy ke Vercel (5 menit)

1. Buka https://vercel.com, klik **Sign Up**, pilih **Continue with GitHub**.
2. Klik **Add New → Project**.
3. Cari `travelink_webapp`, klik **Import**.
4. Vercel otomatis mengenali Vite. Jangan ubah apa pun. Klik **Deploy**.
5. Tunggu 1–2 menit. Muncul alamat seperti `https://travelink-webapp.vercel.app`.

Alamat itulah aplikasinya. Buka dari HP, lalu simpan ke layar utama:
- **Android/Chrome:** titik tiga → Tambahkan ke layar utama
- **iPhone/Safari:** tombol bagikan → Tambahkan ke Layar Utama

Setiap kali kode diperbarui di GitHub, Vercel otomatis memperbarui alamat itu sendiri.

---

## E. Pemeriksaan setelah tayang (10 menit)

Kerjakan berurutan dari HP, semuanya harus berhasil:

1. Masuk sebagai `owner` / `AliImran27`.
2. **Settings → Bisnis & Kwitansi** → isi nomor rekening BRI → Simpan.
3. **Settings → User & PIN** → ganti PIN `admin` jadi yang baru.
4. **Settings → Tampilan** → unggah logo, pilih tema.
5. **Booking → + Booking** → isi satu booking percobaan dengan dua unit sekaligus.
6. **Kwitansi** → pilih booking itu → **Unduh PDF**. Periksa nomor rekening dan kedua unit muncul.
7. Tekan **Salin teks**, tempel di WhatsApp, lihat hasilnya rapi.
8. **Report → Laporan Bulanan** → periksa nilai booking, setoran, laba, dan margin.
9. **Report → Unduh Excel** → pastikan file terunduh.
10. Dari HP kedua, masuk sebagai `admin`. Login akan tertahan.
11. Kembali ke HP owner → **Settings → Perangkat** → **Setujui**.
12. Coba lagi dari HP admin, sekarang bisa masuk. Periksa menu Report, Mitra, dan Settings tidak muncul.
13. Hapus booking percobaan tadi.

---

## Memasukkan data lama Januari–Agustus 2026

Data lama ada di tiga file Excel di Google Drive. Ada dua pilihan:

**Pilihan 1 — ketik ulang.** Sekitar 305 baris. Berat, tapi sekalian membersihkan data.

**Pilihan 2 — impor otomatis.** Kirimkan ketiga file itu ke sesi Claude berikutnya beserta
alamat aplikasi yang sudah tayang. Fitur impor akan ditambahkan ke menu Settings, dan file
Excel bisa langsung diunggah dari sana.

Pilihan 2 lebih hemat waktu. Yang perlu disiapkan sebelum impor: pastikan kolom setoran ke
pemilik unit terisi untuk booking di unit mitra, karena angka itu yang menentukan laba.

---

## Kalau ada masalah

| Gejala | Penyebab dan solusi |
|---|---|
| Halaman putih kosong | Buka browser di komputer, tekan F12, lihat tab Console. Kirim tangkapan layarnya. |
| "Tidak bisa terhubung" | Firestore belum aktif, atau Anonymous di langkah B2 belum dinyalakan. |
| Data tidak tersimpan | Aturan Firestore di B1 belum di-Publish. |
| Upload logo gagal | Storage belum aktif atau aturan B3 belum dipasang. |
| Admin tidak bisa masuk | Perangkatnya belum disetujui di Settings → Perangkat. |
| PDF kosong atau gagal | Coba dari Chrome. Kalau tetap gagal, kirim tangkapan layarnya. |
| Aplikasi tiba-tiba berhenti setelah sebulan | Test mode Firestore habis. Pasang aturan di B1. |

Untuk memperbaiki kode: ubah file di GitHub lewat tombol pensil, atau unggah ulang file yang
diperbaiki. Vercel akan menayangkan versi barunya sendiri dalam satu menit.
