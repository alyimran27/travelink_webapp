import { COL, ambilSemua, ambilDoc, simpanDoc, tambah } from './db';
import { buatGaram, hashPin } from './auth';

export const SETTINGS_ID = 'app';

export const PENGATURAN_DEFAULT = {
  namaPerusahaan: 'TRAVELINK MAKASSAR MANAGEMENT',
  instagram: '@travelinkcom',
  whatsapp: '087850358790',
  email: 'aly.imran27@gmail.com',
  bank: 'BANK BRI',
  namaRekening: 'ALI IMRAN ASRUL',
  noRekening: '', // sengaja kosong — diisi Ali di Settings, tidak ditulis di kode
  judulKwitansi: 'Booking Apartemen Delft CPI',
  ttdNama: 'ALI IMRAN ASRUL',
  ttdJabatan: 'AGEN TRAVELINK MAKASSAR',
  logoUrl: '',
  tema: 'dark-blue',
  formatTanggal: 'DD/MM/YYYY',
  formatJam: '24-jam',
  jamCheckIn: '14:00',
  jamCheckOut: '12:00',
  notif: {
    reminderCheckIn: true,
    reminderCheckOut: true,
    alertSetoran: true,
    alertBelumLunas: true
  },
  versi: '1.0.0'
};

export const LAYANAN = ['Apartemen', 'Villa', 'Rental Mobil', 'Tiket Pesawat'];
export const SUMBER_BOOKING = ['Instagram', 'TikTok', 'WhatsApp', 'Referral', 'Repeat', 'Walk-in', 'Lainnya'];
export const KATEGORI_BIAYA = ['Gaji', 'Wifi/Kuota', 'Parfum & Amenities', 'Promosi', 'Kebersihan', 'Perbaikan', 'Lainnya'];
export const STATUS_PROSPEK = ['Prospek', 'Dihubungi', 'Nego', 'Deal', 'Aktif'];
export const STATUS_BAYAR = ['Belum', 'DP', 'Lunas'];
export const STATUS_SETORAN = ['Belum', 'Pending', 'Issued'];
export const TEMA = [
  { id: 'dark-blue', nama: 'Dark Blue', warna: ['#0f1720', '#1a2332', '#4da6ff'] },
  { id: 'dark-neutral', nama: 'Dark Neutral', warna: ['#0f0f0f', '#1a1a1a', '#d4d4d4'] },
  { id: 'light-blue', nama: 'Light Blue', warna: ['#f2f7fc', '#ffffff', '#0080ff'] },
  { id: 'light-neutral', nama: 'Light Neutral', warna: ['#f5f5f5', '#ffffff', '#4b5563'] }
];

const UNIT_AWAL = [
  { nomor: '1911', tipe: '2BR', properti: 'Delft Apartemen CPI', jenis: 'inti', layanan: 'Apartemen', hargaDefault: 550000 },
  { nomor: '1235', tipe: '2BR', properti: 'Delft Apartemen CPI', jenis: 'inti', layanan: 'Apartemen', hargaDefault: 500000 },
  { nomor: '909', tipe: 'Studio', properti: 'Delft Apartemen CPI', jenis: 'inti', layanan: 'Apartemen', hargaDefault: 400000 },
  { nomor: '805', tipe: '2BR', properti: 'Delft Apartemen CPI', jenis: 'mitra', layanan: 'Apartemen', hargaDefault: 0 },
  { nomor: '759', tipe: '2BR', properti: 'Delft Apartemen CPI', jenis: 'mitra', layanan: 'Apartemen', hargaDefault: 0 },
  { nomor: '751', tipe: '2BR', properti: 'Delft Apartemen CPI', jenis: 'mitra', layanan: 'Apartemen', hargaDefault: 0 },
  { nomor: '1530', tipe: '2BR', properti: 'Delft Apartemen CPI', jenis: 'mitra', layanan: 'Apartemen', hargaDefault: 0 },
  { nomor: 'Vida View', tipe: 'Unit', properti: 'Vida View', jenis: 'mitra', layanan: 'Apartemen', hargaDefault: 0 },
  { nomor: 'Cataluna', tipe: 'Unit', properti: 'Cataluna', jenis: 'mitra', layanan: 'Apartemen', hargaDefault: 0 },
  { nomor: '31 Sudirman Suites', tipe: 'Unit', properti: '31 Sudirman Suites', jenis: 'mitra', layanan: 'Apartemen', hargaDefault: 0 },
  { nomor: 'Royal', tipe: 'Unit', properti: 'Royal', jenis: 'mitra', layanan: 'Apartemen', hargaDefault: 0 },
  { nomor: 'Bandaraya', tipe: 'Unit', properti: 'Bandaraya', jenis: 'mitra', layanan: 'Apartemen', hargaDefault: 0 },
  { nomor: 'Pinus Malino', tipe: 'Villa', properti: 'Malino', jenis: 'mitra', layanan: 'Villa', hargaDefault: 0 },
  { nomor: 'Kolam Renang Malino', tipe: 'Villa', properti: 'Malino', jenis: 'mitra', layanan: 'Villa', hargaDefault: 0 },
  { nomor: 'Villa Mewah Malino', tipe: 'Villa', properti: 'Malino', jenis: 'mitra', layanan: 'Villa', hargaDefault: 0 },
  { nomor: 'Pantai Bira', tipe: 'Villa', properti: 'Bulukumba', jenis: 'mitra', layanan: 'Villa', hargaDefault: 0 },
  { nomor: 'Negeri Atas Awan', tipe: 'Villa', properti: 'Toraja', jenis: 'mitra', layanan: 'Villa', hargaDefault: 0 },
  { nomor: 'Alphard', tipe: 'Mobil', properti: 'Rental Mobil', jenis: 'mitra', layanan: 'Rental Mobil', hargaDefault: 0 },
  { nomor: 'Hiace', tipe: 'Mobil', properti: 'Rental Mobil', jenis: 'mitra', layanan: 'Rental Mobil', hargaDefault: 0 },
  { nomor: 'Fortuner', tipe: 'Mobil', properti: 'Rental Mobil', jenis: 'mitra', layanan: 'Rental Mobil', hargaDefault: 0 },
  { nomor: 'Innova', tipe: 'Mobil', properti: 'Rental Mobil', jenis: 'mitra', layanan: 'Rental Mobil', hargaDefault: 0 },
  { nomor: 'Xpander', tipe: 'Mobil', properti: 'Rental Mobil', jenis: 'mitra', layanan: 'Rental Mobil', hargaDefault: 0 },
  { nomor: 'Terios', tipe: 'Mobil', properti: 'Rental Mobil', jenis: 'mitra', layanan: 'Rental Mobil', hargaDefault: 0 },
  { nomor: 'Brio', tipe: 'Mobil', properti: 'Rental Mobil', jenis: 'mitra', layanan: 'Rental Mobil', hargaDefault: 0 }
];

/** Dijalankan sekali saat aplikasi pertama dibuka. Aman kalau terulang. */
export async function siapkanDataAwal() {
  const s = await ambilDoc(COL.settings, SETTINGS_ID);
  if (!s) await simpanDoc(COL.settings, SETTINGS_ID, PENGATURAN_DEFAULT);

  const users = await ambilSemua(COL.users);
  if (users.length === 0) {
    const g1 = buatGaram();
    await tambah(COL.users, {
      username: 'owner', nama: 'Ali Imran Asrul', role: 'owner', aktif: true,
      garam: g1, pinHash: await hashPin('AliImran27', g1)
    });
    const g2 = buatGaram();
    await tambah(COL.users, {
      username: 'admin', nama: 'Admin Travelink', role: 'admin', aktif: true,
      garam: g2, pinHash: await hashPin('12345', g2)
    });
  }

  const units = await ambilSemua(COL.units);
  if (units.length === 0) {
    for (const u of UNIT_AWAL) {
      await tambah(COL.units, { ...u, mitra: '', kontakMitra: '', komisi: '', aktif: true });
    }
  }
}
