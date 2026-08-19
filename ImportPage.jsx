import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { COL, tambah, ubah, ambilSemua, catatLog } from './db';
import { hitungBooking } from './booking';
import { useToast } from './ui';

/**
 * Import dari file Excel hasil rapian.
 * Lembar "Booking"        -> koleksi bookings
 * Lembar "Unit & Pemilik" -> koleksi units (mitra + kontakMitra)
 */
export default function ImportPage({ user }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [pesanProses, setPesanProses] = useState('');
  const [hasil, setHasil] = useState(null);
  const [gagal, setGagal] = useState([]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setHasil(null);
    setGagal([]);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });

      const lembarBooking = cariLembar(wb, 'Nama Tamu');
      const lembarUnit = cariLembar(wb, 'Unit', 'Nama Pemilik');

      if (!lembarBooking && !lembarUnit) {
        toast('File tidak dikenali. Pastikan ada lembar Booking atau Unit & Pemilik.', 'err');
        setLoading(false);
        return;
      }

      const errorList = [];
      let unitBaru = 0, unitDiperbarui = 0, bookingMasuk = 0, bookingLewat = 0;

      /* ---------- 1. UNIT & PEMILIK ---------- */
      if (lembarUnit) {
        setPesanProses('Membaca data unit…');
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[lembarUnit], { defval: '' });
        const unitLama = await ambilSemua(COL.units);
        const petaUnit = new Map(unitLama.map((u) => [String(u.nomor).trim().toLowerCase(), u]));

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const nomor = String(row['Unit'] || '').trim();
          if (!nomor || nomor.toUpperCase() === 'TOTAL') continue;

          const pemilik = String(row['Nama Pemilik'] || '').trim();
          const mitra = pemilik === '(belum diketahui)' ? '' : pemilik;
          const kontak = String(row['No HP'] || '').trim();

          try {
            const adaLama = petaUnit.get(nomor.toLowerCase());
            if (adaLama) {
              const patch = {};
              if (mitra && !adaLama.mitra) patch.mitra = mitra;
              if (kontak && !adaLama.kontakMitra) patch.kontakMitra = normalHP(kontak);
              if (Object.keys(patch).length) {
                await ubah(COL.units, adaLama.id, patch);
                unitDiperbarui++;
              }
            } else {
              await tambah(COL.units, {
                nomor,
                tipe: String(row['Tipe'] || '').trim(),
                properti: String(row['Properti'] || '').trim() || 'Delft Apartemen CPI',
                jenis: 'mitra',
                layanan: String(row['Layanan'] || '').trim() || 'Apartemen',
                hargaDefault: angka(row['Harga Default']),
                mitra,
                kontakMitra: normalHP(kontak),
                komisi: '',
                aktif: true
              });
              unitBaru++;
            }
          } catch (err) {
            errorList.push(`Unit "${nomor}": ${err.message}`);
          }
        }
      }

      /* ---------- 2. BOOKING ---------- */
      if (lembarBooking) {
        setPesanProses('Membaca data booking…');
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[lembarBooking], { defval: '' });

        // Kunci booking yang sudah ada, supaya impor ulang tidak menggandakan
        const bookingLama = await ambilSemua(COL.bookings);
        const kunciAda = new Set();
        for (const b of bookingLama) {
          for (const it of b.items || []) {
            kunciAda.add(kunci(b.namaTamu, it.unitNomor, it.checkIn, it.unitTipe));
          }
        }

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const namaTamu = String(row['Nama Tamu'] || '').trim();
          if (!namaTamu) continue;

          try {
            const unitNomor = String(row['Unit'] || '').trim();
            const checkIn = toTanggalISO(row['Check-in']);
            const checkOut = toTanggalISO(row['Check-out']);

            if (!unitNomor) throw new Error('unit kosong');
            if (!checkIn || !checkOut) throw new Error('tanggal tidak terbaca');
            if (checkOut < checkIn) throw new Error('check-out lebih awal dari check-in');

            const tipeBaris = String(row['Tipe'] || '').trim();
            if (kunciAda.has(kunci(namaTamu, unitNomor, checkIn, tipeBaris))) {
              bookingLewat++;
              continue;
            }

            // Kolom di bawah ini bersifat pilihan. Berkas lama yang tidak
            // punya kolom-kolom ini tetap terbaca seperti sebelumnya.
            const item = {
              unitNomor,
              unitTipe: String(row['Tipe'] || '').trim(),
              properti: String(row['Properti'] || '').trim(),
              layanan: String(row['Layanan'] || '').trim() || 'Apartemen',
              jenisUnit: 'mitra',
              checkIn,
              checkOut,
              jamCheckIn: String(row['Jam Check-in'] || '').trim(),
              jamCheckOut: String(row['Jam Check-out'] || '').trim(),
              malam: angka(row['Malam']) || 1,
              harga: angka(row['Harga']),
              diskon: angka(row['Diskon']),
              setoranOwner: angka(row['Setoran Owner'])
            };

            const dp = angka(row['DP']);
            // Kalau kolom Pelunasan kosong, anggap sisanya sudah lunas.
            // Memakai harga SESUDAH diskon, bukan harga kotor.
            const bersih = Math.max(0, angka(row['Harga']) - angka(row['Diskon']));
            const kolomPelunasan = String(row['Pelunasan'] ?? '').trim();
            const pelunasan = kolomPelunasan !== '' ? angka(row['Pelunasan']) : Math.max(0, bersih - dp);
            const h = hitungBooking([item], dp, pelunasan);

            const stAsli = String(row['Status Setoran'] || '').trim();
            const statusSetoran = ['Belum', 'Pending', 'Issued'].includes(stAsli) ? stAsli : 'Belum';

            await tambah(COL.bookings, {
              namaTamu,
              noTelepon: normalHP(row['No Telepon']),
              alamat: String(row['Alamat'] || '').trim(),
              sumberBooking: String(row['Sumber Booking'] || '').trim() || 'Lainnya',
              statusSetoran,
              catatan: String(row['Catatan'] || '').trim(),
              items: h.items,
              totalBruto: h.totalBruto,
              totalDiskon: h.totalDiskon,
              total: h.total,
              totalSetoran: h.totalSetoran,
              dp,
              pelunasan,
              sisa: h.sisa,
              statusBayar: h.statusBayar,
              tanggalKwitansi: checkIn,
              dibuatOleh: user?.username || 'import',
              sumberImport: file.name
            });

            kunciAda.add(kunci(namaTamu, unitNomor, checkIn, tipeBaris));
            bookingMasuk++;
          } catch (err) {
            errorList.push(`Baris ${i + 2} (${namaTamu}): ${err.message}`);
          }
        }
      }

      await catatLog(
        user,
        'Import data',
        `${file.name} · ${bookingMasuk} booking, ${unitBaru} unit baru, ${gagalKe(errorList)} gagal`
      );

      setHasil({ bookingMasuk, bookingLewat, unitBaru, unitDiperbarui });
      setGagal(errorList);

      if (bookingMasuk || unitBaru || unitDiperbarui) toast('Import selesai.', 'ok');
      if (errorList.length) toast(`${errorList.length} baris gagal, lihat rincian di bawah.`, 'err');
    } catch (err) {
      console.error(err);
      toast('Gagal membaca file: ' + err.message, 'err');
    } finally {
      setLoading(false);
      setPesanProses('');
      e.target.value = '';
    }
  }

  return (
    <div className="stack">
      <h2>Import Data dari Excel</h2>
      <p className="dim">
        Unggah berkas hasil rapian. Lembar <b>Booking</b> masuk ke daftar booking, lembar{' '}
        <b>Unit &amp; Pemilik</b> masuk ke daftar unit dan mitra. Booking yang sudah pernah masuk
        akan dilewati, jadi aman kalau berkas yang sama diunggah dua kali.
      </p>

      <div className="card">
        <input type="file" accept=".xlsx,.xls" onChange={handleFile} disabled={loading} />
        {loading && <p className="dim mt8">{pesanProses || 'Memproses…'} Jangan tutup halaman ini.</p>}
      </div>

      {hasil && (
        <div className="card">
          <strong>Import selesai.</strong>
          <ul>
            <li>{hasil.bookingMasuk} booking baru ditambahkan</li>
            {hasil.bookingLewat > 0 && <li>{hasil.bookingLewat} booking dilewati (sudah ada sebelumnya)</li>}
            <li>{hasil.unitBaru} unit baru ditambahkan</li>
            {hasil.unitDiperbarui > 0 && <li>{hasil.unitDiperbarui} unit lama dilengkapi data pemiliknya</li>}
          </ul>
        </div>
      )}

      {gagal.length > 0 && (
        <div className="card">
          <strong>{gagal.length} baris tidak bisa diimpor:</strong>
          <ul>
            {gagal.slice(0, 50).map((g, i) => (
              <li key={i} className="tiny">{g}</li>
            ))}
          </ul>
          {gagal.length > 50 && <p className="tiny dim">…dan {gagal.length - 50} lainnya.</p>}
        </div>
      )}
    </div>
  );
}

/* ---------- pembantu ---------- */

function cariLembar(wb, ...wajib) {
  return wb.SheetNames.find((nm) => {
    const baris = XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1, range: 0 })[0];
    if (!baris) return false;
    const judul = baris.map((h) => String(h).trim());
    return wajib.every((w) => judul.includes(w));
  });
}

function kunci(nama, unit, tanggal, tipe) {
  // Tipe ikut dihitung supaya satu tamu yang memesan dua tipe kamar berbeda
  // pada tanggal yang sama tidak dianggap kembar lalu dilewati.
  return [
    String(nama).trim().toLowerCase(),
    String(unit).trim().toLowerCase(),
    tanggal,
    String(tipe || '').trim().toLowerCase()
  ].join('|');
}

function angka(v) {
  if (typeof v === 'number') return Math.round(v);
  const s = String(v || '').replace(/[^\d-]/g, '');
  return s ? parseInt(s, 10) : 0;
}

function normalHP(v) {
  let s = String(v || '').replace(/[^\d]/g, '');
  if (!s) return '';
  if (s.startsWith('62')) s = '0' + s.slice(2);
  else if (!s.startsWith('0')) s = '0' + s;
  return s;
}

/**
 * Ubah nilai tanggal jadi teks YYYY-MM-DD memakai waktu LOKAL.
 * Tidak boleh memakai toISOString(): di WITA (UTC+8) tanggal akan mundur satu hari.
 */
function toTanggalISO(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return lokalISO(v);
  if (typeof v === 'number') {
    const hari = Math.floor(v);
    const d = new Date(1899, 11, 30);
    d.setDate(d.getDate() + hari);
    return lokalISO(d);
  }
  const s = String(v).trim();
  const a = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (a) return `${a[3]}-${a[2].padStart(2, '0')}-${a[1].padStart(2, '0')}`;
  const b = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (b) return `${b[1]}-${b[2].padStart(2, '0')}-${b[3].padStart(2, '0')}`;
  return '';
}

function lokalISO(d) {
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const t = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${t}`;
}

function gagalKe(list) {
  return list.length;
}
