import * as XLSX from 'xlsx';
import { n, bulanKey, labelBulan, hariIni } from './format';
import { hitungBooking, ratakanItem } from './booking';

function autoLebar(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).map((k) => ({
    wch: Math.min(38, Math.max(k.length + 2, ...rows.map((r) => String(r[k] ?? '').length + 2)))
  }));
}

function tambahSheet(wb, nama, rows) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: 'Belum ada data' }]);
  if (rows.length) ws['!cols'] = autoLebar(rows);
  XLSX.utils.book_append_sheet(wb, ws, nama);
}

/** Backup manual: semua data ke satu file Excel. */
export function exportSemua({ bookings, units, expenses, prospects, users, logs }) {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Booking (per item, supaya bisa dipivot per unit)
  const barisBooking = [];
  for (const b of bookings || []) {
    const h = hitungBooking(b.items, b.dp, b.pelunasan);
    h.items.forEach((it, i) => {
      barisBooking.push({
        'ID Booking': b.id,
        'Item ke': i + 1,
        'Nama Tamu': b.namaTamu || '',
        'No WhatsApp': b.noTelepon || '',
        Unit: it.unitNomor || '',
        Tipe: it.unitTipe || '',
        Properti: it.properti || '',
        Layanan: it.layanan || '',
        'Check-in': it.checkIn || '',
        'Jam Masuk': it.jamCheckIn || '',
        'Check-out': it.checkOut || '',
        'Jam Keluar': it.jamCheckOut || '',
        Malam: n(it.malam),
        Harga: n(it.harga),
        Diskon: n(it.diskon),
        Subtotal: n(it.subtotal),
        'Setoran Owner': n(it.setoranOwner),
        'Total Booking': i === 0 ? h.total : '',
        DP: i === 0 ? n(b.dp) : '',
        Pelunasan: i === 0 ? n(b.pelunasan) : '',
        Sisa: i === 0 ? h.sisa : '',
        'Status Bayar': i === 0 ? b.statusBayar || h.statusBayar : '',
        'Status Setoran': i === 0 ? b.statusSetoran || '' : '',
        Sumber: i === 0 ? b.sumberBooking || '' : '',
        Catatan: i === 0 ? b.catatan || '' : ''
      });
    });
  }
  tambahSheet(wb, 'Booking', barisBooking);

  // Sheet 2 — Unit
  tambahSheet(
    wb,
    'Unit',
    (units || []).map((u) => ({
      Nomor: u.nomor, Tipe: u.tipe || '', Properti: u.properti || '',
      Jenis: u.jenis || '', Layanan: u.layanan || '', Mitra: u.mitra || '',
      'Kontak Mitra': u.kontakMitra || '', Komisi: u.komisi || '',
      'Harga Default': n(u.hargaDefault), Aktif: u.aktif === false ? 'Tidak' : 'Ya'
    }))
  );

  // Sheet 3 — Biaya
  tambahSheet(
    wb,
    'Biaya',
    (expenses || []).map((e) => ({
      Tanggal: e.tanggal || '', Keterangan: e.keterangan || '',
      Kategori: e.kategori || '', Unit: e.unitNomor || 'Umum', Nominal: n(e.nominal)
    }))
  );

  // Sheet 4 — Rekap bulanan
  tambahSheet(wb, 'Rekap Bulanan', rekapBulanan(bookings, expenses));

  // Sheet 5 — Rekap per unit
  tambahSheet(wb, 'Rekap Per Unit', rekapPerUnit(bookings, expenses));

  // Sheet 6 — Prospek
  tambahSheet(
    wb,
    'Prospek',
    (prospects || []).map((p) => ({
      Nama: p.nama || '', Kontak: p.kontak || '', Properti: p.properti || '',
      'Unit Rencana': p.unitRencana || '', Status: p.status || '', Catatan: p.catatan || ''
    }))
  );

  // Sheet 7 — User (tanpa PIN hash, demi keamanan)
  tambahSheet(
    wb,
    'User',
    (users || []).map((u) => ({
      Username: u.username, Nama: u.nama || '', Role: u.role, Aktif: u.aktif === false ? 'Tidak' : 'Ya'
    }))
  );

  // Sheet 8 — Log aktivitas
  if (logs?.length) {
    tambahSheet(
      wb,
      'Log Aktivitas',
      logs.map((l) => ({
        Waktu: new Date(l.waktu).toLocaleString('id-ID'),
        User: l.user, Role: l.role, Aksi: l.aksi, Detail: l.detail || ''
      }))
    );
  }

  XLSX.writeFile(wb, `travelink-backup-${hariIni()}.xlsx`);
}

export function rekapBulanan(bookings, expenses) {
  const peta = {};
  const isi = (key) => (peta[key] = peta[key] || { nilai: 0, setoran: 0, malam: 0, biaya: 0 });

  for (const it of ratakanItem(bookings)) {
    if (!it.bulan) continue;
    const p = isi(it.bulan);
    p.nilai += n(it.subtotal);
    p.setoran += n(it.setoranOwner);
    p.malam += n(it.malam);
  }
  for (const e of expenses || []) {
    const k = bulanKey(e.tanggal);
    if (!k) continue;
    isi(k).biaya += n(e.nominal);
  }

  return Object.keys(peta)
    .sort()
    .map((k) => {
      const p = peta[k];
      const laba = p.nilai - p.setoran;
      return {
        Bulan: labelBulan(k),
        'Nilai Booking Bruto': p.nilai,
        'Setoran Owner': p.setoran,
        'Laba Kotor Travelink': laba,
        Biaya: p.biaya,
        'Kas Bersih': laba - p.biaya,
        'Malam Terisi': p.malam,
        'Margin %': p.nilai ? Math.round((laba / p.nilai) * 1000) / 10 : 0
      };
    });
}

export function rekapPerUnit(bookings, expenses) {
  const peta = {};
  const isi = (u) => (peta[u] = peta[u] || { nilai: 0, setoran: 0, malam: 0, biaya: 0, jml: 0 });

  for (const it of ratakanItem(bookings)) {
    const p = isi(it.unitNomor || '(tanpa unit)');
    p.nilai += n(it.subtotal);
    p.setoran += n(it.setoranOwner);
    p.malam += n(it.malam);
    p.jml += 1;
  }
  for (const e of expenses || []) {
    if (!e.unitNomor) continue;
    isi(e.unitNomor).biaya += n(e.nominal);
  }

  return Object.keys(peta)
    .sort()
    .map((u) => {
      const p = peta[u];
      const laba = p.nilai - p.setoran;
      return {
        Unit: u,
        'Jumlah Item Booking': p.jml,
        'Malam Terisi': p.malam,
        'Nilai Booking Bruto': p.nilai,
        'Setoran Owner': p.setoran,
        'Laba Kotor Travelink': laba,
        'Biaya Unit': p.biaya,
        'Kas Bersih': laba - p.biaya,
        'Margin %': p.nilai ? Math.round((laba / p.nilai) * 1000) / 10 : 0
      };
    });
}
