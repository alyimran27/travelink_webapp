# Travelink Makassar Management

Aplikasi web pengelolaan booking apartemen, villa, rental mobil, dan tiket pesawat.
React + Vite + Firebase Firestore. Bisa dibuka dari HP mana saja lewat satu URL.

---

## Cara pertama kali menjalankan di komputer

Buka Command Prompt di dalam folder ini, lalu jalankan dua perintah:

```
npm install
npm run dev
```

Buka alamat yang muncul di layar (biasanya `http://localhost:5173`).

Untuk deploy ke internet, ikuti **PANDUAN-DEPLOY.md**.

---

## Masuk pertama kali

| Role | Username | PIN |
|---|---|---|
| Owner | `owner` | `AliImran27` |
| Admin | `admin` | `12345` |

**Langkah pertama setelah masuk sebagai owner:**

1. Buka **Settings → Bisnis & Kwitansi**, isi **nomor rekening BRI**. Tanpa ini, kwitansi tercetak tanpa nomor rekening.
2. Buka **Settings → User & PIN**, ganti PIN `admin`. PIN `12345` terlalu mudah ditebak.
3. Buka **Settings → Tampilan**, unggah logo Travelink.
4. Buka **Mitra & Prospek → Unit Aktif**, lengkapi nama mitra dan kesepakatan setoran tiap unit.

---

## Isi menu

| Menu | Owner | Admin |
|---|---|---|
| Beranda | penuh | tanpa laba, biaya, margin |
| Booking | ya | ya |
| Kwitansi | ya | ya |
| Katalog | ya | ya |
| Report | ya | tidak |
| Mitra & Prospek | ya | tidak |
| Settings | ya | tidak |

---

## Tiga angka yang tidak boleh dicampur

Spreadsheet lama menjumlahkan omzet hanya dari tiga unit inti (1911, 1235, 909), sehingga
booking di unit mitra tidak pernah masuk hitungan. Aplikasi ini memisahkannya:

```
Nilai Booking Bruto  = seluruh nilai transaksi, termasuk unit mitra
Setoran Owner        = uang yang disetor ke pemilik unit
Laba Kotor Travelink = Nilai Booking Bruto − Setoran Owner
Kas Bersih           = Laba Kotor − Biaya
Margin %             = Laba Kotor ÷ Nilai Booking Bruto
```

Kalau kolom setoran dibiarkan kosong pada booking unit mitra, laba akan terlihat lebih
besar dari kenyataan. Beranda menampilkan peringatan untuk booking seperti itu.

---

## Satu booking bisa banyak unit

Satu booking berisi daftar item. Tiap item punya unit, tanggal, harga, dan setoran sendiri.
Satu tamu yang menyewa dua unit sekaligus tetap satu booking dan satu kwitansi — kwitansinya
menampilkan dua baris.

---

## Kunci perangkat

Owner bisa masuk dari perangkat mana saja; perangkatnya tercatat otomatis.
Admin yang masuk dari perangkat baru akan tertahan sampai Owner menyetujuinya di
**Settings → Perangkat**.

Ini pagar, bukan brankas. Kalau admin menghapus data browser atau memakai mode penyamaran,
tanda perangkatnya hilang dan ia harus minta persetujuan lagi. Kalau ia sengaja menyalin
tanda perangkat itu, secara teknis masih bisa dipindahkan. Untuk tim 3–5 orang ini memadai.
Kalau nanti perlu lebih ketat, tambahkan kode OTP lewat email untuk setiap perangkat baru.

---

## Backup

Paket gratis Firebase tidak menyediakan backup otomatis. Unduh Excel dari
**Report → Unduh Excel** atau **Settings → Data & Log** secara berkala, lalu simpan di Google Drive.
File berisi booking, unit, biaya, rekap bulanan, rekap per unit, prospek, user, dan log aktivitas.

---

## Struktur file

```
src/
  firebase.js              koneksi ke Firebase
  App.jsx                  penentu halaman dan pemuat data
  lib/
    format.js              format rupiah dan tanggal
    db.js                  baca tulis database
    auth.js                PIN dan kunci perangkat
    booking.js             perhitungan booking
    image.js               unggah logo
    seed.js                data awal dan daftar pilihan
  components/              tiap halaman dan komponen tampilan
  utils/
    kwitansi.js            kwitansi PDF dan teks WhatsApp
    excel.js               export Excel
    access.js              hak akses per role
  styles/global.css        warna, tema, dan tata letak
firestore.rules            aturan akses database
storage.rules              aturan akses penyimpanan logo
```
