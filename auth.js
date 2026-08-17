import { COL, cariSatu, tambah, ubah, ambilSemua, catatLog } from './db';

const KUNCI_DEVICE = 'travelink_device_token';
const KUNCI_SESI = 'travelink_sesi';

/** Hash PIN dengan SHA-256 + garam per user. Tidak pernah menyimpan PIN asli. */
export async function hashPin(pin, garam) {
  const data = new TextEncoder().encode(`travelink|${garam}|${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function buatGaram() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function buatToken() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function tokenDevice() {
  let t = localStorage.getItem(KUNCI_DEVICE);
  if (!t) {
    t = buatToken();
    localStorage.setItem(KUNCI_DEVICE, t);
  }
  return t;
}

export function namaDeviceTebakan() {
  const ua = navigator.userAgent || '';
  let os = 'Perangkat';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iPhone/iPad';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS/i.test(ua)) os = 'Mac';
  let br = 'Browser';
  if (/Edg\//.test(ua)) br = 'Edge';
  else if (/Chrome\//.test(ua)) br = 'Chrome';
  else if (/Firefox\//.test(ua)) br = 'Firefox';
  else if (/Safari\//.test(ua)) br = 'Safari';
  return `${os} · ${br}`;
}

/**
 * Login.
 * Hasil: { ok, user } | { ok:false, alasan:'pin' } | { ok:false, alasan:'device', status }
 *
 * Aturan device:
 * - Owner: device langsung disetujui otomatis (kalau tidak, tidak ada yang bisa approve).
 * - Admin: device baru masuk daftar tunggu, harus disetujui Owner di Settings.
 */
export async function login(username, pin) {
  const u = String(username || '').trim().toLowerCase();
  const user = await cariSatu(COL.users, 'username', u);
  if (!user || user.aktif === false) return { ok: false, alasan: 'pin' };

  const hash = await hashPin(pin, user.garam);
  if (hash !== user.pinHash) return { ok: false, alasan: 'pin' };

  const token = tokenDevice();
  const devices = await ambilSemua(COL.devices);
  let device = devices.find((d) => d.token === token && d.userId === user.id);

  if (!device) {
    const otomatisSetuju = user.role === 'owner';
    const id = await tambah(COL.devices, {
      userId: user.id,
      username: user.username,
      token,
      nama: namaDeviceTebakan(),
      status: otomatisSetuju ? 'disetujui' : 'menunggu',
      terakhirDipakai: Date.now()
    });
    device = { id, status: otomatisSetuju ? 'disetujui' : 'menunggu' };
    if (!otomatisSetuju) {
      await catatLog(user, 'Perangkat baru menunggu persetujuan', `${user.username} · ${namaDeviceTebakan()}`);
      return { ok: false, alasan: 'device', status: 'menunggu' };
    }
  }

  if (device.status !== 'disetujui') {
    return { ok: false, alasan: 'device', status: device.status };
  }

  await ubah(COL.devices, device.id, { terakhirDipakai: Date.now(), nama: device.nama || namaDeviceTebakan() });

  const sesi = { id: user.id, username: user.username, nama: user.nama || user.username, role: user.role };
  sessionStorage.setItem(KUNCI_SESI, JSON.stringify(sesi));
  await catatLog(sesi, 'Login', namaDeviceTebakan());
  return { ok: true, user: sesi };
}

export function sesiTersimpan() {
  try {
    const raw = sessionStorage.getItem(KUNCI_SESI);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  sessionStorage.removeItem(KUNCI_SESI);
}

export async function gantiPin(userId, pinBaru) {
  const garam = buatGaram();
  const pinHash = await hashPin(pinBaru, garam);
  await ubah(COL.users, userId, { garam, pinHash });
}
