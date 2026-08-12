import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { hariIni, bulanKey, labelBulan, bulan12, rupiahRingkas, rupiah, n, BULAN_PENDEK, waLink } from './format';
import { hitungBooking, ratakanItem, itemPadaTanggal } from './booking';
import { bolehLihatUang } from './access';
import { Kpi, Kosong, badgeBayar } from './ui';

export default function Dashboard({ user, bookings, expenses, setMenu }) {
  const hari = hariIni();
  const bulanIni = bulanKey(hari);
  const lihatUang = bolehLihatUang(user.role);
  const [selesai, setSelesai] = useState({}); // hanya di sesi ini, tidak disimpan ke database

  const masuk = useMemo(() => itemPadaTanggal(bookings, hari, 'checkIn'), [bookings, hari]);
  const keluar = useMemo(() => itemPadaTanggal(bookings, hari, 'checkOut'), [bookings, hari]);

  const ringkas = useMemo(() => {
    const items = ratakanItem(bookings).filter((i) => i.bulan === bulanIni);
    const nilai = items.reduce((a, i) => a + n(i.subtotal), 0);
    const setoran = items.reduce((a, i) => a + n(i.setoranOwner), 0);
    const malam = items.reduce((a, i) => a + n(i.malam), 0);
    const biaya = (expenses || [])
      .filter((e) => bulanKey(e.tanggal) === bulanIni)
      .reduce((a, e) => a + n(e.nominal), 0);
    return { nilai, setoran, malam, biaya, laba: nilai - setoran, kas: nilai - setoran - biaya, jumlah: items.length };
  }, [bookings, expenses, bulanIni]);

  const tren = useMemo(() => {
    const kunci = bulan12(bulanIni);
    const peta = Object.fromEntries(kunci.map((k) => [k, { nilai: 0, laba: 0 }]));
    for (const it of ratakanItem(bookings)) {
      if (peta[it.bulan]) {
        peta[it.bulan].nilai += n(it.subtotal);
        peta[it.bulan].laba += n(it.subtotal) - n(it.setoranOwner);
      }
    }
    return kunci.map((k) => ({
      bulan: BULAN_PENDEK[Number(k.split('-')[1]) - 1],
      nilai: peta[k].nilai,
      laba: peta[k].laba
    }));
  }, [bookings, bulanIni]);

  const belumLunas = useMemo(
    () => (bookings || []).filter((b) => hitungBooking(b.items, b.dp, b.pelunasan).sisa > 0),
    [bookings]
  );
  const setoranPending = useMemo(
    () => (bookings || []).filter((b) => b.statusSetoran === 'Pending' || b.statusSetoran === 'Belum'),
    [bookings]
  );
  const setoranKosong = useMemo(
    () =>
      (bookings || []).filter((b) =>
        (b.items || []).some((i) => i.jenisUnit === 'mitra' && !n(i.setoranOwner))
      ),
    [bookings]
  );

  return (
    <div className="stack">
      {/* ====== HARI INI ====== */}
      <div className="card">
        <div className="card-head">
          <div>
            <h2>Hari Ini</h2>
            <div className="small dim">{labelHariLengkap(hari)}</div>
          </div>
          <button className="btn kecil" onClick={() => setMenu('booking')}>Buka Booking</button>
        </div>

        <div className="hariini">
          <div>
            <div className="tiny dim" style={{ marginBottom: 8 }}>Check-in ({masuk.length})</div>
            {masuk.length === 0 && <div className="kosong small">Tidak ada tamu masuk hari ini.</div>}
            {masuk.map((it, i) => (
              <BarisTamu
                key={`in-${it.bookingId}-${i}`}
                item={it}
                jam={it.jamCheckIn}
                selesai={!!selesai[`in-${it.bookingId}-${i}`]}
                onToggle={() => setSelesai((s) => ({ ...s, [`in-${it.bookingId}-${i}`]: !s[`in-${it.bookingId}-${i}`] }))}
              />
            ))}
          </div>

          <div>
            <div className="tiny dim" style={{ marginBottom: 8 }}>Check-out ({keluar.length})</div>
            {keluar.length === 0 && <div className="kosong small">Tidak ada tamu keluar hari ini.</div>}
            {keluar.map((it, i) => (
              <BarisTamu
                key={`out-${it.bookingId}-${i}`}
                item={it}
                jam={it.jamCheckOut}
                selesai={!!selesai[`out-${it.bookingId}-${i}`]}
                onToggle={() => setSelesai((s) => ({ ...s, [`out-${it.bookingId}-${i}`]: !s[`out-${it.bookingId}-${i}`] }))}
              />
            ))}
          </div>
        </div>
        <div className="small dim mt8">Centang hanya tanda sudah dihandle di sesi ini. Kalau halaman dimuat ulang, daftar kembali penuh.</div>
      </div>

      {/* ====== KPI ====== */}
      <div className="grid grid-kpi">
        <Kpi utama label={`Nilai Booking · ${labelBulan(bulanIni)}`} angka={rupiahRingkas(ringkas.nilai)} sub={`${ringkas.jumlah} item booking`} />
        <Kpi label="Malam Terisi" angka={ringkas.malam} sub="bulan berjalan" />
        <Kpi label="Setoran Owner" angka={rupiahRingkas(ringkas.setoran)} sub="dibayar ke pemilik unit" />
        {lihatUang && <Kpi label="Laba Kotor Travelink" angka={rupiahRingkas(ringkas.laba)} sub="nilai booking − setoran" />}
        {lihatUang && <Kpi label="Biaya" angka={rupiahRingkas(ringkas.biaya)} sub="bulan berjalan" />}
        {lihatUang && <Kpi label="Kas Bersih" angka={rupiahRingkas(ringkas.kas)} sub="laba kotor − biaya" />}
      </div>

      {/* ====== ALERT ====== */}
      {(belumLunas.length > 0 || setoranPending.length > 0 || setoranKosong.length > 0) && (
        <div className="stack">
          {belumLunas.length > 0 && (
            <div className="alert">
              <span>⚠️</span>
              <span>
                <b>{belumLunas.length} booking belum lunas</b> — total sisa tagihan{' '}
                {rupiah(belumLunas.reduce((a, b) => a + Math.max(0, hitungBooking(b.items, b.dp, b.pelunasan).sisa), 0))}.
              </span>
            </div>
          )}
          {setoranPending.length > 0 && (
            <div className="alert bad">
              <span>💸</span>
              <span><b>{setoranPending.length} booking</b> setorannya ke pemilik unit belum diselesaikan.</span>
            </div>
          )}
          {setoranKosong.length > 0 && (
            <div className="alert info">
              <span>📝</span>
              <span><b>{setoranKosong.length} booking unit mitra</b> nilai setorannya masih kosong. Isi supaya laba terhitung benar.</span>
            </div>
          )}
        </div>
      )}

      {/* ====== GRAFIK ====== */}
      <div className="card">
        <div className="card-head">
          <h2>Tren 12 Bulan</h2>
          <span className="small dim">{lihatUang ? 'Nilai booking & laba kotor' : 'Nilai booking'}</span>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={tren} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.18)" vertical={false} />
              <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000000 ? `${Math.round(v / 1000000)}jt` : v >= 1000 ? `${Math.round(v / 1000)}rb` : v)}
              />
              <Tooltip
                formatter={(v, nama) => [rupiah(v), nama === 'nilai' ? 'Nilai booking' : 'Laba kotor']}
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--text)' }}
              />
              <Bar dataKey="nilai" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              {lihatUang && <Bar dataKey="laba" fill="var(--accent-light)" radius={[4, 4, 0, 0]} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {bookings.length === 0 && (
        <Kosong
          pesan="Belum ada booking sama sekali."
          aksi={<button className="btn primary" onClick={() => setMenu('booking')}>Buat booking pertama</button>}
        />
      )}
    </div>
  );
}

function BarisTamu({ item, jam, selesai, onToggle }) {
  return (
    <div className={`strip${selesai ? ' selesai' : ''}`}>
      <input type="checkbox" checked={selesai} onChange={onToggle} aria-label="Tandai sudah dihandle" />
      <span className="jam mono">{jam || '--:--'}</span>
      <span className="unit">{item.unitNomor || '-'}</span>
      <span className="grow">
        <div className="nama">{item.namaTamu || '-'}</div>
        <div className="small dim">{item.layanan}{item.malam ? ` · ${item.malam} malam` : ''}</div>
      </span>
      {badgeBayar(item.statusBayar)}
      {item.noTelepon && (
        <a className="btn kecil" href={waLink(item.noTelepon, `Halo ${item.namaTamu},`)} target="_blank" rel="noreferrer">WA</a>
      )}
    </div>
  );
}

function labelHariLengkap(iso) {
  const d = new Date(iso + 'T00:00:00');
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.getDay()];
  return `${hari}, ${d.getDate()} ${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][d.getMonth()]} ${d.getFullYear()}`;
}
