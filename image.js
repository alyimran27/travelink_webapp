import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export const MAKS_UKURAN = 2 * 1024 * 1024; // 2 MB
const TIPE_OK = ['image/jpeg', 'image/png', 'image/webp'];

export function cekFileGambar(file) {
  if (!file) return 'Belum ada file yang dipilih.';
  if (!TIPE_OK.includes(file.type)) return 'Format tidak didukung. Pakai JPG, PNG, atau WebP.';
  if (file.size > MAKS_UKURAN) return 'Ukuran file lebih dari 2 MB. Pilih gambar yang lebih kecil.';
  return null;
}

/** Kecilkan gambar jadi maksimal 800x800 px supaya ringan dibuka dari HP. */
export function kecilkanGambar(file, maks = 800) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > h && w > maks) { h = Math.round((h * maks) / w); w = maks; }
      else if (h >= w && h > maks) { w = Math.round((w * maks) / h); h = maks; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Gagal memproses gambar'))), 'image/png', 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('File gambar tidak bisa dibaca')); };
    img.src = url;
  });
}

/** Batas aman data URL logo. Satu dokumen Firestore maksimal 1 MB. */
const MAKS_DATAURL = 600 * 1024;

function gambarKeDataUrl(img, maks, tipe, mutu) {
  let { width: w, height: h } = img;
  if (w > h && w > maks) { h = Math.round((h * maks) / w); w = maks; }
  else if (h >= w && h > maks) { w = Math.round((w * maks) / h); h = maks; }
  const canvas = document.createElement('canvas');
  canvas.width = w || 1;
  canvas.height = h || 1;
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(tipe, mutu);
}

function muatGambar(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('File gambar tidak bisa dibaca.')); };
    img.src = url;
  });
}

/**
 * Siapkan logo sebagai data URL yang cukup kecil untuk disimpan langsung
 * di Firestore. Tidak memakai Firebase Storage, jadi tidak perlu mengaktifkan
 * Storage maupun memasang Storage Rules.
 * Ukuran diturunkan bertahap sampai muat; PNG dipakai lebih dulu agar latar
 * transparan tetap terjaga, JPG hanya dipakai kalau PNG masih kebesaran.
 */
export async function siapkanLogo(file, onProgress) {
  const pesan = cekFileGambar(file);
  if (pesan) throw new Error(pesan);

  onProgress && onProgress(15);
  const img = await muatGambar(file);
  onProgress && onProgress(40);

  const percobaan = [
    [320, 'image/png', undefined],
    [256, 'image/png', undefined],
    [320, 'image/jpeg', 0.85],
    [256, 'image/jpeg', 0.8],
    [192, 'image/jpeg', 0.75],
    [128, 'image/jpeg', 0.7]
  ];

  for (let i = 0; i < percobaan.length; i++) {
    const [maks, tipe, mutu] = percobaan[i];
    const dataUrl = gambarKeDataUrl(img, maks, tipe, mutu);
    onProgress && onProgress(40 + Math.round(((i + 1) / percobaan.length) * 55));
    if (dataUrl && dataUrl.length <= MAKS_DATAURL) {
      onProgress && onProgress(100);
      return dataUrl;
    }
  }

  throw new Error('Gambar terlalu berat walau sudah dikecilkan. Pakai logo yang lebih sederhana atau berukuran lebih kecil.');
}

/** Unggah logo ke Firebase Storage. onProgress menerima angka 0-100. */
export async function unggahLogo(file, onProgress) {
  const pesan = cekFileGambar(file);
  if (pesan) throw new Error(pesan);
  const blob = await kecilkanGambar(file);
  const path = `travelink/logo-${Date.now()}.png`;
  const tugas = uploadBytesResumable(ref(storage, path), blob, { contentType: 'image/png' });

  return new Promise((resolve, reject) => {
    tugas.on(
      'state_changed',
      (snap) => onProgress && onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => reject(new Error(pesanErrorStorage(err))),
      async () => resolve({ url: await getDownloadURL(tugas.snapshot.ref), path })
    );
  });
}

export async function hapusLogo(path) {
  if (!path) return;
  try { await deleteObject(ref(storage, path)); } catch (e) { console.warn('Logo lama tidak terhapus:', e?.code); }
}

function pesanErrorStorage(err) {
  const kode = err?.code || '';
  if (kode.includes('unauthorized')) return 'Firebase Storage menolak upload. Aktifkan Storage dan pasang Storage Rules (lihat storage.rules).';
  if (kode.includes('retry-limit')) return 'Koneksi terputus saat upload. Coba lagi.';
  return 'Upload gagal: ' + (err?.message || kode);
}

/** Ubah URL gambar jadi data URL, dipakai jsPDF untuk menempel logo di kwitansi. */
export async function urlKeDataUrl(url) {
  // Logo yang disimpan langsung di Firestore sudah berbentuk data URL,
  // jadi tidak perlu diambil lewat jaringan (sekaligus menghindari CORS).
  if (typeof url === 'string' && url.startsWith('data:')) return url;
  const res = await fetch(url, { mode: 'cors' });
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
