import { n, hitungMalam, bulanKey } from './format';

/** Jumlah unit hitung: malam, minimal 1 (untuk tiket pesawat / sewa harian tanpa menginap). */
export function jumlahUnitHitung(item) {
  const m = n(item.malam);
  return m > 0 ? m : 1;
}

export function subtotalItem(item) {
  return n(item.harga) * jumlahUnitHitung(item) - n(item.diskon);
}

export function itemBaru(pengaturan) {
  return {
    unitNomor: '',
    unitTipe: '',
    properti: '',
    layanan: 'Apartemen',
    checkIn: '',
    checkOut: '',
    jamCheckIn: pengaturan?.jamCheckIn || '14:00',
    jamCheckOut: pengaturan?.jamCheckOut || '12:00',
    malam: 0,
    harga: 0,
    diskon: 0,
    setoranOwner: 0
  };
}

/** Rapikan item: hitung malam otomatis dari tanggal. */
export function rapikanItem(item) {
  const malam = hitungMalam(item.checkIn, item.checkOut);
  return { ...item, malam, subtotal: subtotalItem({ ...item, malam }) };
}

/** Hitung seluruh total booking dari daftar item + pembayaran. */
export function hitungBooking(items, dp, pelunasan) {
  const list = (items || []).map(rapikanItem);
  const totalBruto = list.reduce((a, i) => a + n(i.harga) * jumlahUnitHitung(i), 0);
  const totalDiskon = list.reduce((a, i) => a + n(i.diskon), 0);
  const total = totalBruto - totalDiskon;
  const totalSetoran = list.reduce((a, i) => a + n(i.setoranOwner), 0);
  const terbayar = n(dp) + n(pelunasan);
  const sisa = total - terbayar;
  const totalMalam = list.reduce((a, i) => a + n(i.malam), 0);

  let statusBayar = 'Belum';
  if (total > 0 && sisa <= 0) statusBayar = 'Lunas';
  else if (terbayar > 0) statusBayar = 'DP';

  return {
    items: list,
    totalBruto,
    totalDiskon,
    total,
    totalSetoran,
    labaKotor: total - totalSetoran,
    terbayar,
    sisa,
    totalMalam,
    statusBayar
  };
}

/** Semua item dari semua booking, diratakan jadi satu daftar (untuk laporan per unit). */
export function ratakanItem(bookings) {
  const out = [];
  for (const b of bookings || []) {
    for (const [idx, it] of (b.items || []).entries()) {
      out.push({
        ...it,
        subtotal: subtotalItem(it),
        bookingId: b.id,
        namaTamu: b.namaTamu,
        noTelepon: b.noTelepon,
        statusBayar: b.statusBayar,
        statusSetoran: b.statusSetoran,
        sumberBooking: b.sumberBooking,
        itemIndex: idx,
        bulan: bulanKey(it.checkIn)
      });
    }
  }
  return out;
}

/** Booking yang punya item check-in pada tanggal tertentu. */
export function itemPadaTanggal(bookings, tanggal, medan) {
  const out = [];
  for (const b of bookings || []) {
    for (const it of b.items || []) {
      if (it[medan] === tanggal) out.push({ ...it, bookingId: b.id, namaTamu: b.namaTamu, noTelepon: b.noTelepon, statusBayar: b.statusBayar });
    }
  }
  return out.sort((a, x) => String(a.jamCheckIn || '').localeCompare(String(x.jamCheckIn || '')));
}

/** Cek unit sedang terisi pada tanggal tertentu (check-in <= tgl < check-out). */
export function unitTerisi(bookings, unitNomor, tanggal) {
  for (const b of bookings || []) {
    for (const it of b.items || []) {
      if (it.unitNomor !== unitNomor) continue;
      if (it.checkIn && it.checkOut && it.checkIn <= tanggal && tanggal < it.checkOut) {
        return { ...it, namaTamu: b.namaTamu, bookingId: b.id };
      }
    }
  }
  return null;
}
