import React, { useEffect, useState } from 'react';
import { COL, simpanDoc, tambah, ubah, hapus, catatLog, ambilLog, ambilSemua } from './db';
import { SETTINGS_ID, TEMA, PENGATURAN_DEFAULT } from './seed';
import { buatGaram, hashPin, gantiPin, tokenDevice } from './auth';
import { unggahLogo } from './image';
import { exportSemua } from './excel';
import { rupiah, n } from './format';
import { Modal, Field, InputRupiah, Konfirmasi, Kosong, Badge, useToast } from './ui';

export default function SettingsPage({ user, pengaturan, units, bookings, expenses, prospects }) {
  const [tab, setTab] = useState('bisnis');

  return (
    <div className="stack">
      <div className="tabbar">
        <button className={tab === 'bisnis' ? 'aktif' : ''} onClick={() => setTab('bisnis')}>Bisnis & Kwitansi</button>
        <button className={tab === 'tampilan' ? 'aktif' : ''} onClick={() => setTab('tampilan')}>Tampilan</button>
        <button className={tab === 'user' ? 'aktif' : ''} onClick={() => setTab('user')}>User & PIN</button>
        <button className={tab === 'device' ? 'aktif' : ''} onClick={() => setTab('device')}>Perangkat</button>
        <button className={tab === 'default' ? 'aktif' : ''} onClick={() => setTab('default')}>Default Booking</button>
        <button className={tab === 'data' ? 'aktif' : ''} onClick={() => setTab('data')}>Data & Log</button>
      </div>

      {tab === 'bisnis' && <Bisnis user={user} p={pengaturan} />}
      {tab === 'tampilan' && <Tampilan user={user} p={pengaturan} />}
      {tab === 'user' && <UserPin user={user} />}
      {tab === 'device' && <Perangkat user={user} />}
      {tab === 'default' && <DefaultBooking user={user} p={pengaturan} units={units} />}
      {tab === 'data' && (
        <DataLog user={user} p={pengaturan} units={units} bookings={bookings} expenses={expenses} prospects={prospects} />
      )}
    </div>
  );
}

/* =============== BISNIS =============== */
function Bisnis({ user, p }) {
  const toast = useToast();
  const [f, setF] = useState({ ...PENGATURAN_DEFAULT, ...p });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function simpan() {
    await simpanDoc(COL.settings, SETTINGS_ID, {
      namaPerusahaan: f.namaPerusahaan, instagram: f.instagram, whatsapp: f.whatsapp, email: f.email,
      bank: f.bank, namaRekening: f.namaRekening, noRekening: f.noRekening,
      judulKwitansi: f.judulKwitansi, ttdNama: f.ttdNama, ttdJabatan: f.ttdJabatan
    });
    await catatLog(user, 'Ubah pengaturan bisnis', '');
    toast('Pengaturan tersimpan.');
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head"><h2>Identitas Bisnis</h2></div>
        <div className="stack">
          <div className="f-grid">
            <Field label="Nama perusahaan"><input value={f.namaPerusahaan} onChange={(e) => set('namaPerusahaan', e.target.value)} /></Field>
            <Field label="Instagram"><input value={f.instagram} onChange={(e) => set('instagram', e.target.value)} /></Field>
            <Field label="No WhatsApp"><input value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} inputMode="tel" /></Field>
            <Field label="Email"><input value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Rekening Pembayaran</h2></div>
        <div className="f-grid">
          <Field label="Bank"><input value={f.bank} onChange={(e) => set('bank', e.target.value)} /></Field>
          <Field label="Nama rekening"><input value={f.namaRekening} onChange={(e) => set('namaRekening', e.target.value)} /></Field>
          <Field label="Nomor rekening"><input value={f.noRekening} onChange={(e) => set('noRekening', e.target.value)} inputMode="numeric" /></Field>
        </div>
        {!f.noRekening && <div className="alert mt16"><span>⚠️</span><span>Nomor rekening masih kosong, jadi kwitansi tercetak tanpa nomor rekening.</span></div>}
      </div>

      <div className="card">
        <div className="card-head"><h2>Kwitansi</h2></div>
        <div className="stack">
          <Field label="Baris judul kwitansi">
            <input value={f.judulKwitansi} onChange={(e) => set('judulKwitansi', e.target.value)} placeholder="Booking Apartemen Delft CPI" />
          </Field>
          <div className="f-grid">
            <Field label="Jabatan pada tanda tangan"><input value={f.ttdJabatan} onChange={(e) => set('ttdJabatan', e.target.value)} /></Field>
            <Field label="Nama pada tanda tangan"><input value={f.ttdNama} onChange={(e) => set('ttdNama', e.target.value)} /></Field>
          </div>
        </div>
      </div>

      <div className="row"><div className="grow" /><button className="btn primary" onClick={simpan}>Simpan perubahan</button></div>
    </div>
  );
}

/* =============== TAMPILAN =============== */
function Tampilan({ user, p }) {
  const toast = useToast();
  const [naik, setNaik] = useState(false);
  const [progres, setProgres] = useState(0);

  async function pilihFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setNaik(true); setProgres(0);
    try {
      const { url, path } = await unggahLogo(file, setProgres);
      await simpanDoc(COL.settings, SETTINGS_ID, { logoUrl: url, logoPath: path });
      await catatLog(user, 'Ganti logo', '');
      toast('Logo diperbarui.');
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setNaik(false);
    }
  }

  async function gantiTema(id) {
    await simpanDoc(COL.settings, SETTINGS_ID, { tema: id });
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head"><h2>Logo</h2></div>
        <div className="row wrap" style={{ alignItems: 'flex-start', gap: 18 }}>
          <div className="logo-preview">
            {p.logoUrl ? <img src={p.logoUrl} alt="Logo Travelink" /> : <span className="small dim">Belum ada logo</span>}
          </div>
          <div className="grow stack">
            <div className="small dim">Format JPG, PNG, atau WebP. Maksimal 2 MB. Gambar otomatis dikecilkan ke 800 px agar cepat dibuka dari HP. Logo muncul di layar masuk, sidebar, dan kwitansi PDF.</div>
            <div className="row wrap">
              <label className="btn primary">
                {naik ? `Mengunggah ${progres}%` : 'Pilih gambar'}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pilihFile} style={{ display: 'none' }} disabled={naik} />
              </label>
              {p.logoUrl && (
                <button
                  className="btn danger"
                  onClick={async () => {
                    await simpanDoc(COL.settings, SETTINGS_ID, { logoUrl: '', logoPath: '' });
                    toast('Logo dihapus.');
                  }}
                >
                  Hapus logo
                </button>
              )}
            </div>
            {naik && <div className="bar"><i style={{ width: `${progres}%` }} /></div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Tema</h2></div>
        <div className="tema-grid">
          {TEMA.map((t) => (
            <button key={t.id} className={`tema-opsi${p.tema === t.id ? ' aktif' : ''}`} onClick={() => gantiTema(t.id)}>
              <span className="tema-dot">
                {t.warna.map((w) => <i key={w} style={{ background: w }} />)}
              </span>
              <span className="bold small">{t.nama}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Format</h2></div>
        <div className="f-grid">
          <Field label="Format tanggal">
            <select value={p.formatTanggal || 'DD/MM/YYYY'} onChange={(e) => simpanDoc(COL.settings, SETTINGS_ID, { formatTanggal: e.target.value })}>
              <option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option>
            </select>
          </Field>
          <Field label="Format jam">
            <select value={p.formatJam || '24-jam'} onChange={(e) => simpanDoc(COL.settings, SETTINGS_ID, { formatJam: e.target.value })}>
              <option>24-jam</option><option>12-jam</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Notifikasi</h2></div>
        <div className="stack">
          {[
            ['reminderCheckIn', 'Tampilkan pengingat check-in di Beranda'],
            ['reminderCheckOut', 'Tampilkan pengingat check-out di Beranda'],
            ['alertSetoran', 'Tampilkan peringatan setoran ke pemilik unit'],
            ['alertBelumLunas', 'Tampilkan peringatan booking belum lunas']
          ].map(([k, label]) => (
            <label className="row" key={k}>
              <input
                type="checkbox"
                checked={p.notif?.[k] !== false}
                onChange={(e) => simpanDoc(COL.settings, SETTINGS_ID, { notif: { ...(p.notif || {}), [k]: e.target.checked } })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =============== USER & PIN =============== */
function UserPin({ user }) {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);
  const [pinForm, setPinForm] = useState(null);
  const [konfirm, setKonfirm] = useState(null);
  const [muat, setMuat] = useState(0);

  useEffect(() => {
    ambilSemua(COL.users).then((d) => setUsers(d.sort((a, b) => String(a.role).localeCompare(String(b.role)))));
  }, [muat]);

  async function simpanUser(data) {
    const ada = users.find((u) => u.username === data.username);
    if (ada) return toast('Username itu sudah dipakai.', 'err');
    const garam = buatGaram();
    await tambah(COL.users, {
      username: data.username, nama: data.nama, role: data.role, aktif: true,
      garam, pinHash: await hashPin(data.pin, garam)
    });
    await catatLog(user, 'Tambah user', `${data.username} (${data.role})`);
    toast('User ditambahkan.');
    setForm(null); setMuat((x) => x + 1);
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <h2>Daftar User</h2>
          <button className="btn primary kecil" onClick={() => setForm({})}>+ User</button>
        </div>
        <div className="tabel-wrap">
          <table>
            <thead><tr><th>Username</th><th>Nama</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="mono bold">{u.username}</td>
                  <td>{u.nama}</td>
                  <td>{u.role === 'owner' ? <Badge jenis="info" anak="Owner" /> : <Badge jenis="netral" anak="Admin" />}</td>
                  <td>{u.aktif === false ? <Badge jenis="bad" anak="Nonaktif" /> : <Badge jenis="ok" anak="Aktif" />}</td>
                  <td className="right nowrap">
                    <button className="btn kecil" onClick={() => setPinForm(u)}>Ganti PIN</button>{' '}
                    <button
                      className="btn kecil"
                      onClick={async () => {
                        await ubah(COL.users, u.id, { aktif: u.aktif === false });
                        setMuat((x) => x + 1);
                      }}
                      disabled={u.id === user.id}
                    >
                      {u.aktif === false ? 'Aktifkan' : 'Nonaktifkan'}
                    </button>{' '}
                    <button className="btn kecil danger" onClick={() => setKonfirm(u)} disabled={u.id === user.id}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="small dim mt16">PIN disimpan dalam bentuk acak terenkripsi, jadi PIN lama tidak bisa dibaca siapa pun — termasuk dari halaman ini. Kalau lupa, buat PIN baru.</div>
      </div>

      {form && (
        <Modal
          judul="User Baru"
          onTutup={() => setForm(null)}
          lebar={480}
          anak={<FormUserBaru onKirim={simpanUser} />}
        />
      )}

      {pinForm && (
        <FormGantiPin
          target={pinForm}
          onTutup={() => setPinForm(null)}
          onSelesai={async (pinBaru) => {
            await gantiPin(pinForm.id, pinBaru);
            await catatLog(user, 'Ganti PIN', pinForm.username);
            toast(`PIN ${pinForm.username} diperbarui.`);
            setPinForm(null);
          }}
        />
      )}

      {konfirm && (
        <Konfirmasi
          judul="Hapus user"
          pesan={`User ${konfirm.username} akan dihapus dan tidak bisa masuk lagi. Lanjutkan?`}
          onYa={async () => {
            await hapus(COL.users, konfirm.id);
            await catatLog(user, 'Hapus user', konfirm.username);
            toast('User dihapus.');
            setKonfirm(null); setMuat((x) => x + 1);
          }}
          onBatal={() => setKonfirm(null)}
        />
      )}
    </div>
  );
}

function FormUserBaru({ onKirim }) {
  const [f, setF] = useState({ username: '', nama: '', role: 'admin', pin: '' });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.username.trim().length >= 3 && f.pin.length >= 4;

  return (
    <div className="stack">
      <div className="f-grid">
        <Field label="Username"><input value={f.username} onChange={(e) => set('username', e.target.value.toLowerCase().trim())} autoCapitalize="none" /></Field>
        <Field label="Nama lengkap"><input value={f.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
      </div>
      <div className="f-grid">
        <Field label="Role">
          <select value={f.role} onChange={(e) => set('role', e.target.value)}>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
        </Field>
        <Field label="PIN (minimal 4 karakter)"><input type="password" value={f.pin} onChange={(e) => set('pin', e.target.value)} /></Field>
      </div>
      <button className="btn primary" disabled={!valid} onClick={() => onKirim({ ...f, nama: f.nama || f.username })}>
        Tambah user
      </button>
    </div>
  );
}

function FormGantiPin({ target, onTutup, onSelesai }) {
  const [pin, setPin] = useState('');
  const [ulang, setUlang] = useState('');
  const cocok = pin.length >= 4 && pin === ulang;

  return (
    <Modal
      judul={`Ganti PIN — ${target.username}`}
      onTutup={onTutup}
      lebar={430}
      footer={
        <>
          <button className="btn" onClick={onTutup}>Batal</button>
          <button className="btn primary" disabled={!cocok} onClick={() => onSelesai(pin)}>Simpan PIN</button>
        </>
      }
      anak={
        <div className="stack">
          <Field label="PIN baru (minimal 4 karakter)"><input type="password" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus /></Field>
          <Field label="Ulangi PIN baru"><input type="password" value={ulang} onChange={(e) => setUlang(e.target.value)} /></Field>
          {ulang && !cocok && <div className="alert bad">PIN belum cocok atau kurang dari 4 karakter.</div>}
        </div>
      }
    />
  );
}

/* =============== PERANGKAT =============== */
function Perangkat({ user }) {
  const toast = useToast();
  const [devices, setDevices] = useState([]);
  const [muat, setMuat] = useState(0);
  const [konfirm, setKonfirm] = useState(null);
  const tokenSaya = tokenDevice();

  useEffect(() => {
    ambilSemua(COL.devices).then((d) => setDevices(d.sort((a, b) => (b.terakhirDipakai || 0) - (a.terakhirDipakai || 0))));
  }, [muat]);

  async function setStatus(d, status) {
    await ubah(COL.devices, d.id, { status });
    await catatLog(user, 'Ubah status perangkat', `${d.username} · ${d.nama} → ${status}`);
    toast(`Perangkat ${status}.`);
    setMuat((x) => x + 1);
  }

  const menunggu = devices.filter((d) => d.status === 'menunggu');

  return (
    <div className="stack">
      {menunggu.length > 0 && (
        <div className="alert"><span>📱</span><span><b>{menunggu.length} perangkat</b> menunggu persetujuan.</span></div>
      )}

      <div className="card">
        <div className="card-head"><h2>Perangkat Terdaftar</h2></div>
        {devices.length === 0 ? (
          <Kosong pesan="Belum ada perangkat terdaftar." />
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>User</th><th>Perangkat</th><th>Status</th><th>Terakhir dipakai</th><th></th></tr></thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id}>
                    <td className="mono">{d.username}</td>
                    <td>
                      {d.nama}
                      {d.token === tokenSaya && <div className="tiny" style={{ color: 'var(--accent)' }}>Perangkat yang sedang dipakai</div>}
                    </td>
                    <td>
                      {d.status === 'disetujui' ? <Badge jenis="ok" anak="Disetujui" />
                        : d.status === 'menunggu' ? <Badge jenis="warn" anak="Menunggu" />
                        : <Badge jenis="bad" anak="Ditolak" />}
                    </td>
                    <td className="small dim nowrap">{d.terakhirDipakai ? new Date(d.terakhirDipakai).toLocaleString('id-ID') : '—'}</td>
                    <td className="right nowrap">
                      {d.status !== 'disetujui' && <><button className="btn kecil" onClick={() => setStatus(d, 'disetujui')}>Setujui</button>{' '}</>}
                      {d.status !== 'ditolak' && <><button className="btn kecil" onClick={() => setStatus(d, 'ditolak')}>Tolak</button>{' '}</>}
                      <button className="btn kecil danger" onClick={() => setKonfirm(d)}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="alert info mt16">
          <span>ℹ️</span>
          <span>
            Kunci perangkat ini adalah <b>pagar, bukan brankas</b>. Kalau admin menghapus data browser atau memakai mode penyamaran, tandanya hilang dan ia harus minta persetujuan lagi. Kalau ia sengaja menyalin tanda perangkatnya, secara teknis masih bisa dipindah. Untuk tim kecil ini sudah memadai; kalau perlu lebih ketat, tambahkan kode OTP lewat email di versi berikutnya.
          </span>
        </div>
      </div>

      {konfirm && (
        <Konfirmasi
          judul="Hapus perangkat"
          pesan={`Perangkat "${konfirm.nama}" milik ${konfirm.username} akan dihapus. Ia harus minta persetujuan lagi saat login berikutnya.`}
          onYa={async () => {
            await hapus(COL.devices, konfirm.id);
            await catatLog(user, 'Hapus perangkat', `${konfirm.username} · ${konfirm.nama}`);
            toast('Perangkat dihapus.');
            setKonfirm(null); setMuat((x) => x + 1);
          }}
          onBatal={() => setKonfirm(null)}
        />
      )}
    </div>
  );
}

/* =============== DEFAULT BOOKING =============== */
function DefaultBooking({ user, p, units }) {
  const toast = useToast();
  const [jamIn, setJamIn] = useState(p.jamCheckIn || '14:00');
  const [jamOut, setJamOut] = useState(p.jamCheckOut || '12:00');

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head"><h2>Jam Default</h2></div>
        <div className="f-grid">
          <Field label="Jam check-in"><input type="time" value={jamIn} onChange={(e) => setJamIn(e.target.value)} /></Field>
          <Field label="Jam check-out"><input type="time" value={jamOut} onChange={(e) => setJamOut(e.target.value)} /></Field>
        </div>
        <div className="row mt16">
          <div className="grow" />
          <button
            className="btn primary"
            onClick={async () => {
              await simpanDoc(COL.settings, SETTINGS_ID, { jamCheckIn: jamIn, jamCheckOut: jamOut });
              await catatLog(user, 'Ubah jam default', `${jamIn} / ${jamOut}`);
              toast('Jam default tersimpan.');
            }}
          >
            Simpan
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Harga Default per Unit</h2></div>
        <div className="small dim" style={{ marginBottom: 12 }}>Harga ini otomatis terisi saat unit dipilih di form booking. Masih bisa diubah per booking.</div>
        <div className="tabel-wrap">
          <table>
            <thead><tr><th>Unit</th><th>Properti</th><th className="num" style={{ width: 190 }}>Harga default</th></tr></thead>
            <tbody>
              {(units || []).filter((u) => u.aktif !== false).map((u) => (
                <BarisHarga key={u.id} unit={u} onSimpan={(v) => ubah(COL.units, u.id, { hargaDefault: v })} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BarisHarga({ unit, onSimpan }) {
  const [nilai, setNilai] = useState(n(unit.hargaDefault));
  useEffect(() => setNilai(n(unit.hargaDefault)), [unit.hargaDefault]);
  return (
    <tr>
      <td className="mono bold">{unit.nomor}</td>
      <td className="small dim">{unit.properti}</td>
      <td className="num">
        <InputRupiah nilai={nilai} onUbah={setNilai} onSelesai={onSimpan} style={{ textAlign: 'right' }} />
      </td>
    </tr>
  );
}

/* =============== DATA & LOG =============== */
function DataLog({ user, p, units, bookings, expenses, prospects }) {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [muat, setMuat] = useState(false);

  async function tampilkanLog() {
    setMuat(true);
    setLogs(await ambilLog(200));
    setMuat(false);
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head"><h2>Backup Data</h2></div>
        <div className="small dim">
          Firebase paket gratis tidak menyediakan backup otomatis. Unduh file Excel ini secara berkala — itulah cadangan datamu. Simpan di Google Drive supaya aman.
        </div>
        <div className="row mt16">
          <button
            className="btn primary"
            onClick={async () => {
              const users = await ambilSemua(COL.users);
              const l = await ambilLog(500);
              exportSemua({ bookings, units, expenses, prospects, users, logs: l });
              await catatLog(user, 'Export Excel', 'backup manual');
              toast('File Excel terunduh.');
            }}
          >
            Unduh semua data (Excel)
          </button>
        </div>
        <div className="small dim mt16">
          Isi file: {bookings.length} booking · {units.length} unit · {expenses.length} biaya · {prospects.length} prospek.
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Log Aktivitas</h2>
          <button className="btn kecil" onClick={tampilkanLog} disabled={muat}>{muat ? 'Memuat…' : 'Muat log'}</button>
        </div>
        {logs.length === 0 ? (
          <Kosong pesan="Tekan Muat log untuk melihat 200 aktivitas terakhir." />
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Detail</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="small nowrap dim">{new Date(l.waktu).toLocaleString('id-ID')}</td>
                    <td className="mono small">{l.user}</td>
                    <td className="small">{l.aksi}</td>
                    <td className="small dim">{l.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head"><h2>Tentang Aplikasi</h2></div>
        <div className="small">
          <div className="spread"><span className="dim">Nama</span><span>{p.namaPerusahaan}</span></div>
          <div className="spread"><span className="dim">Versi</span><span className="mono">{p.versi || '1.0.0'}</span></div>
          <div className="spread"><span className="dim">Database</span><span className="mono">Firebase Firestore</span></div>
        </div>
      </div>
    </div>
  );
}
