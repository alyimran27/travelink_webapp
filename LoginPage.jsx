import React, { useState } from 'react';
import { login } from './auth';
import { Field } from './ui';

export default function LoginPage({ pengaturan, onMasuk }) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [proses, setProses] = useState(false);
  const [pesan, setPesan] = useState(null);

  async function kirim(e) {
    e.preventDefault();
    if (!username.trim() || !pin) {
      setPesan({ jenis: 'bad', teks: 'Isi username dan PIN dulu.' });
      return;
    }
    setProses(true);
    setPesan(null);
    try {
      const hasil = await login(username, pin);
      if (hasil.ok) {
        onMasuk(hasil.user);
        return;
      }
      if (hasil.alasan === 'device') {
        setPesan({
          jenis: 'warn',
          teks:
            hasil.status === 'ditolak'
              ? 'Perangkat ini ditolak. Hubungi Owner untuk membukanya lagi.'
              : 'Perangkat ini belum terdaftar. Minta Owner menyetujuinya di Settings, lalu login lagi dari perangkat ini.'
        });
      } else {
        setPesan({ jenis: 'bad', teks: 'Username atau PIN salah.' });
      }
    } catch (err) {
      console.error(err);
      setPesan({ jenis: 'bad', teks: 'Tidak bisa terhubung ke server. Cek koneksi internet.' });
    } finally {
      setProses(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={kirim}>
        <div className="login-logo">
          {pengaturan?.logoUrl ? (
            <img src={pengaturan.logoUrl} alt="" />
          ) : (
            <div className="brand-mark" style={{ width: 46, height: 46, fontSize: 19 }}>TM</div>
          )}
        </div>

        <h1>{pengaturan?.namaPerusahaan || 'Travelink Makassar Management'}</h1>

        <div className="stack mt24">
          <Field label="Username">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </Field>

          <Field label="PIN">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="current-password"
            />
          </Field>

          {pesan && <div className={`alert ${pesan.jenis === 'bad' ? 'bad' : ''}`}>{pesan.teks}</div>}

          <button className="btn primary blok" disabled={proses}>
            {proses ? 'Memeriksa…' : 'Masuk'}
          </button>
        </div>

        <div className="center small dim mt16">Versi {pengaturan?.versi || '1.0.0'}</div>
      </form>
    </div>
  );
}
