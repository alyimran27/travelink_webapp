import React, { useMemo, useState } from 'react';
import { COL, hapus, catatLog } from './db';
import { hitungBooking, saringBookingUntukPeran } from './booking';
import { rupiah, tglPendek, bulanKey, labelBulan, hariIni, n } from './format';
import { bolehLihatUang } from './access';
import { Konfirmasi, Kosong, badgeBayar, badgeSetoran, useToast } from './ui';
import BookingForm from './BookingForm';

export default function BookingList({ user, units, pengaturan, bookings, onBuatKwitansi }) {
  const toast = useToast();
  const [cari, setCari] = useState('');
  const [bulan, setBulan] = useState('semua');
  const [status, setStatus] = useState('semua');
  const [form, setForm] = useState(null);
  const [konfirm, setKonfirm] = useState(null);

  const owner = bolehLihatUang(user?.role);

  // Selain owner hanya melihat booking yang belum check-out. Disaring paling
  // awal supaya filter, pencarian, dan angka ringkasan ikut terbatas.
  const terlihat = useMemo(
    () => saringBookingUntukPeran(bookings, user?.role, hariIni()),
    [bookings, user]
  );

  const daftarBulan = useMemo(() => {
    const set = new Set();
    for (const b of terlihat) for (const it of b.items || []) if (it.checkIn) set.add(bulanKey(it.checkIn));
    return [...set].sort().reverse();
  }, [terlihat]);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return terlihat
      .filter((b) => {
        if (bulan !== 'semua' && !(b.items || []).some((it) => bulanKey(it.checkIn) === bulan)) return false;
        if (status !== 'semua') {
          const s = hitungBooking(b.items, b.dp, b.pelunasan).statusBayar;
          if (s !== status) return false;
        }
        if (!q) return true;
        const teks = [b.namaTamu, b.noTelepon, ...(b.items || []).map((i) => i.unitNomor)].join(' ').toLowerCase();
        return teks.includes(q);
      })
      .sort((a, b) => (b.items?.[0]?.checkIn || '').localeCompare(a.items?.[0]?.checkIn || ''));
  }, [terlihat, cari, bulan, status]);

  const total = useMemo(() => {
    let nilai = 0, sisa = 0, malam = 0;
    for (const b of tampil) {
      const h = hitungBooking(b.items, b.dp, b.pelunasan);
      nilai += h.total; sisa += Math.max(0, h.sisa); malam += h.totalMalam;
    }
    return { nilai, sisa, malam };
  }, [tampil]);

  async function hapusBooking(b) {
    try {
      await hapus(COL.bookings, b.id);
      await catatLog(user, 'Hapus booking', `${b.namaTamu}`);
      toast('Booking dihapus.');
    } catch {
      toast('Gagal menghapus.', 'err');
    }
    setKonfirm(null);
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="row wrap">
          <input
            className="grow"
            style={{ minWidth: 180 }}
            placeholder="Cari nama tamu, nomor HP, atau unit"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
          <select value={bulan} onChange={(e) => setBulan(e.target.value)} style={{ width: 'auto' }}>
            <option value="semua">Semua bulan</option>
            {daftarBulan.map((k) => <option key={k} value={k}>{labelBulan(k)}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 'auto' }}>
            <option value="semua">Semua status</option>
            <option>Lunas</option>
            <option>DP</option>
            <option>Belum</option>
          </select>
          <button className="btn primary" onClick={() => setForm({})}>+ Booking</button>
        </div>

        <div className="row wrap small dim mt16">
          <span>{tampil.length} booking</span>
          <span>·</span>
          <span>{total.malam} malam</span>
          <span>·</span>
          <span>Nilai {rupiah(total.nilai)}</span>
          {total.sisa > 0 && (<><span>·</span><span style={{ color: 'var(--warning)' }}>Sisa {rupiah(total.sisa)}</span></>)}
        </div>
      </div>

      <div className="card">
        {tampil.length === 0 ? (
          <Kosong
            pesan={
              terlihat.length === 0
                ? owner
                  ? 'Belum ada booking.'
                  : 'Belum ada tamu yang sedang menginap. Booking yang sudah check-out hanya bisa dibuka Owner.'
                : 'Tidak ada booking yang cocok dengan filter.'
            }
            aksi={<button className="btn primary" onClick={() => setForm({})}>Buat booking</button>}
          />
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tamu</th>
                  <th>Unit</th>
                  <th>Periode</th>
                  <th className="num">Malam</th>
                  <th className="num">Total</th>
                  <th className="num">Sisa</th>
                  <th>Bayar</th>
                  <th>Setoran</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((b) => {
                  const h = hitungBooking(b.items, b.dp, b.pelunasan);
                  const it0 = h.items[0] || {};
                  const akhir = h.items[h.items.length - 1] || {};
                  return (
                    <tr key={b.id}>
                      <td>
                        <div className="bold">{b.namaTamu}</div>
                        <div className="small dim">{b.noTelepon || '-'}{b.sumberBooking ? ` · ${b.sumberBooking}` : ''}</div>
                      </td>
                      <td>
                        <div className="mono small">{h.items.map((i) => i.unitNomor).join(', ')}</div>
                        {h.items.length > 1 && <div className="tiny dim">{h.items.length} unit</div>}
                      </td>
                      <td className="small nowrap">
                        {tglPendek(it0.checkIn)}<br />
                        <span className="dim">→ {tglPendek(akhir.checkOut)}</span>
                      </td>
                      <td className="num">{h.totalMalam}</td>
                      <td className="num">{rupiah(h.total)}</td>
                      <td className="num" style={{ color: h.sisa > 0 ? 'var(--warning)' : 'inherit' }}>
                        {rupiah(Math.max(0, h.sisa))}
                      </td>
                      <td>{badgeBayar(h.statusBayar)}</td>
                      <td>{badgeSetoran(b.statusSetoran)}</td>
                      <td className="nowrap right">
                        <button className="btn kecil" onClick={() => onBuatKwitansi(b)}>Kwitansi</button>{' '}
                        <button className="btn kecil" onClick={() => setForm(b)}>Ubah</button>{' '}
                        <button className="btn kecil danger" onClick={() => setKonfirm(b)}>Hapus</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <BookingForm
          awal={form.id ? form : null}
          units={units}
          pengaturan={pengaturan}
          user={user}
          onTutup={() => setForm(null)}
        />
      )}

      {konfirm && (
        <Konfirmasi
          judul="Hapus booking"
          pesan={`Booking atas nama ${konfirm.namaTamu} akan dihapus permanen. Lanjutkan?`}
          onYa={() => hapusBooking(konfirm)}
          onBatal={() => setKonfirm(null)}
        />
      )}
    </div>
  );
}
