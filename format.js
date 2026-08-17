export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
export const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** 1250000 -> "1.250.000" */
export function ribuan(v) {
  const x = Math.round(n(v));
  const neg = x < 0;
  const s = Math.abs(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + s;
}

/** 1250000 -> "Rp 1.250.000" (aman untuk jsPDF, tanpa karakter aneh) */
export function rupiah(v) {
  return 'Rp ' + ribuan(v);
}

/** 1250000 -> "Rp 1,25 jt" untuk kartu KPI */
export function rupiahRingkas(v) {
  const x = n(v);
  const a = Math.abs(x);
  if (a >= 1_000_000_000) return `Rp ${(x / 1_000_000_000).toFixed(2).replace('.', ',')} M`;
  if (a >= 1_000_000) return `Rp ${(x / 1_000_000).toFixed(1).replace('.', ',')} jt`;
  if (a >= 1_000) return `Rp ${(x / 1000).toFixed(0)} rb`;
  return rupiah(x);
}

export function hariIni() {
  return toISO(new Date());
}

/** Date -> "YYYY-MM-DD" pakai waktu lokal (bukan UTC, biar tidak geser sehari) */
export function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const t = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${t}`;
}

export function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = String(s).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** "2026-08-11" -> "11 Agu 2026" */
export function tglPendek(s) {
  const d = parseISO(s);
  if (!d) return '-';
  return `${d.getDate()} ${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}`;
}

/** "2026-08-11" -> "11 Agustus 2026" */
export function tglPanjang(s) {
  const d = parseISO(s);
  if (!d) return '-';
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** Jumlah malam antara check-in & check-out */
export function hitungMalam(checkIn, checkOut) {
  const a = parseISO(checkIn);
  const b = parseISO(checkOut);
  if (!a || !b) return 0;
  const ms = b.getTime() - a.getTime();
  const malam = Math.round(ms / 86400000);
  return malam > 0 ? malam : 0;
}

/** "2026-08" dari tanggal */
export function bulanKey(s) {
  return String(s || '').slice(0, 7);
}

export function labelBulan(key) {
  const [y, m] = String(key || '').split('-');
  if (!y || !m) return '-';
  return `${BULAN[Number(m) - 1]} ${y}`;
}

/** Daftar 12 bulan terakhir sampai bulan acuan, ex: ["2025-09", ... "2026-08"] */
export function bulan12(sampai) {
  const [y, m] = sampai.split('-').map(Number);
  const out = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export function normalisasiTelepon(t) {
  return String(t || '').replace(/[^0-9]/g, '');
}

export function waLink(nomor, teks) {
  let x = normalisasiTelepon(nomor);
  if (x.startsWith('0')) x = '62' + x.slice(1);
  return `https://wa.me/${x}?text=${encodeURIComponent(teks || '')}`;
}

export function slug(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
