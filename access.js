export const MENU = [
  { id: 'beranda', label: 'Beranda', ico: '🏠', role: ['owner', 'admin'] },
  { id: 'booking', label: 'Booking', ico: '📋', role: ['owner', 'admin'] },
  { id: 'kwitansi', label: 'Kwitansi', ico: '🧾', role: ['owner', 'admin'] },
  { id: 'katalog', label: 'Katalog', ico: '🏢', role: ['owner', 'admin'] },
  { id: 'report', label: 'Report', ico: '📊', role: ['owner'] },
  { id: 'mitra', label: 'Mitra & Prospek', ico: '🤝', role: ['owner'] },
  { id: 'import', label: 'Import Data', ico: '📥', role: ['owner'] },
  { id: 'settings', label: 'Settings', ico: '⚙️', role: ['owner'] }
];

export function menuUntuk(role) {
  return MENU.filter((m) => m.role.includes(role));
}

export function bolehBuka(role, menuId) {
  const m = MENU.find((x) => x.id === menuId);
  return !!m && m.role.includes(role);
}

/** Owner saja yang boleh melihat angka laba, biaya, dan margin. */
export function bolehLihatUang(role) {
  // Dibuat tahan terhadap variasi penulisan (spasi, huruf besar) supaya data
  // uang tidak pernah bocor hanya karena beda penulisan peran.
  return String(role || '').trim().toLowerCase() === 'owner';
}
