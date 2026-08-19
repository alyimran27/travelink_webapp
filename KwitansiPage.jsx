import React, { useMemo, useState } from 'react';
import { hitungBooking, lengkapiDariUnit, saringBookingUntukPeran, bookingMasihAktif } from './booking';
import { rupiah, tglPendek, tglPanjang, hariIni } from './format';
import { teksKwitansi, unduhPdfKwitansi } from './kwitansi';
import { catatLog } from './db';
import { bolehLihatUang } from './access';
import { Kosong, useToast, badgeBayar } from './ui';

export default function KwitansiPage({ user, pengaturan, bookings, units, terpilih, setTerpilih }) {
  const toast = useToast();
  const [cari, setCari] = useState('');
  const [proses, setProses] = useState(false);

  // Selain owner hanya boleh membuat kwitansi untuk tamu yang belum check-out.
  const terlihat = useMemo(
    () => saringBookingUntukPeran(bookings, user?.role, hariIni()),
    [bookings, user]
  );

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return terlihat
      .filter((b) => !q || `${b.namaTamu} ${b.noTelepon} ${(b.items || []).map((i) => i.unitNomor).join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => (b.items?.[0]?.checkIn || '').localeCompare(a.items?.[0]?.checkIn || ''))
      .slice(0, 60);
  }, [terlihat, cari]);

  const dipilih = terpilih ? bookings.find((b) => b.id === terpilih.id) || terpilih : null;

  // Penjagaan kedua: kalau booking terpilih ternyata sudah check-out dan yang
  // membuka bukan owner, kwitansinya tidak boleh dibuka lewat jalur mana pun.
  const bolehBukaIni =
    !dipilih ||
    bolehLihatUang(user?.role) ||
    bookingMasihAktif(dipilih, hariIni());
  const booking = bolehBukaIni ? dipilih : null;

  async function unduh() {
    if (!pengaturan.noRekening) {
      toast('Nomor rekening masih kosong. Isi dulu di Settings supaya muncul di kwitansi.', 'err');
    }
    setProses(true);
    try {
      await unduhPdfKwitansi(booking, pengaturan, units);
      await catatLog(user, 'Unduh kwitansi PDF', booking.namaTamu);
      toast('PDF kwitansi terunduh.');
    } catch (e) {
      console.error(e);
      toast('PDF gagal dibuat: ' + e.message, 'err');
    } finally {
      setProses(false);
    }
  }

  async function salin() {
    const teks = teksKwitansi(booking, pengaturan, units);
    try {
      await navigator.clipboard.writeText(teks);
      toast('Teks kwitansi disalin. Tinggal tempel di WhatsApp.');
    } catch {
      window.prompt('Salin teks berikut secara manual:', teks);
    }
  }

  if (!booking) {
    return (
      <div className="card">
        <div className="card-head">
          <h2>Pilih booking untuk dibuatkan kwitansi</h2>
        </div>
        <input placeholder="Cari nama tamu atau unit" value={cari} onChange={(e) => setCari(e.target.value)} />
        <div className="mt16">
          {daftar.length === 0 ? (
            <Kosong
              pesan={
                bolehLihatUang(user?.role)
                  ? 'Belum ada booking yang bisa dibuatkan kwitansi.'
                  : 'Belum ada tamu yang sedang menginap. Kwitansi tamu yang sudah check-out hanya bisa dibuat Owner.'
              }
            />
          ) : (
            <div className="tabel-wrap">
              <table>
                <thead>
                  <tr><th>Tamu</th><th>Unit</th><th>Check-in</th><th className="num">Total</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {daftar.map((b) => {
                    const h = hitungBooking(b.items, b.dp, b.pelunasan);
                    return (
                      <tr key={b.id}>
                        <td className="bold">{b.namaTamu}</td>
                        <td className="mono small">{h.items.map((i) => i.unitNomor).join(', ')}</td>
                        <td className="small nowrap">{tglPendek(h.items[0]?.checkIn)}</td>
                        <td className="num">{rupiah(h.total)}</td>
                        <td>{badgeBayar(h.statusBayar)}</td>
                        <td className="right">
                          <button className="btn kecil primary" onClick={() => setTerpilih(b)}>Buat kwitansi</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  const h = hitungBooking(lengkapiDariUnit(booking.items, units), booking.dp, booking.pelunasan);
  const s = pengaturan;

  return (
    <div className="stack">
      <div className="card">
        <div className="row wrap">
          <button className="btn" onClick={() => setTerpilih(null)}>← Pilih booking lain</button>
          <div className="grow" />
          <button className="btn" onClick={salin}>Salin teks</button>
          <button className="btn primary" onClick={unduh} disabled={proses}>
            {proses ? 'Membuat PDF…' : 'Unduh PDF'}
          </button>
        </div>
        {!s.noRekening && (
          <div className="alert mt16">
            <span>⚠️</span>
            <span>Nomor rekening belum diisi di Settings, jadi baris NO REK di kwitansi masih kosong.</span>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="card">
        <div className="kw">
          <div style={{ textAlign: 'center' }}>
            {s.logoUrl && <img src={s.logoUrl} alt="" style={{ maxHeight: 54, marginBottom: 8 }} />}
            <h2 style={{ letterSpacing: '0.08em' }}>KWITANSI</h2>
            <div style={{ fontWeight: 700, marginTop: 4 }}>{s.namaPerusahaan}</div>
            {s.judulKwitansi && <div>{s.judulKwitansi}</div>}
            {s.instagram && <div style={{ color: '#666' }}>By {s.instagram}</div>}
          </div>

          <div className="kw-sep" />

          <table style={{ marginBottom: 12 }}>
            <tbody>
              <Baris k="Nama Penyewa" v={booking.namaTamu} />
              <Baris k="No WhatsApp" v={booking.noTelepon || '-'} />
              {booking.alamat && <Baris k="Alamat" v={booking.alamat} />}
              <Baris k="Tanggal" v={tglPanjang(booking.tanggalKwitansi || hariIni())} />
            </tbody>
          </table>

          <table>
            <thead>
              <tr>
                <th>Unit</th><th>Check-in</th><th>Check-out</th>
                <th style={{ textAlign: 'center' }}>Periode</th>
                <th style={{ textAlign: 'right' }}>Harga</th>
                <th style={{ textAlign: 'right' }}>Diskon</th>
                <th style={{ textAlign: 'right' }}>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {h.items.map((it, i) => (
                <tr key={i}>
                  <td>
                    <b>{it.unitNomor}</b>
                    {it.unitTipe && <div style={{ color: '#666', fontSize: 11 }}>{it.unitTipe}</div>}
                    {it.properti && <div style={{ color: '#999', fontSize: 10 }}>{it.properti}</div>}
                  </td>
                  <td>{tglPendek(it.checkIn)}<div style={{ color: '#666', fontSize: 11 }}>{it.jamCheckIn}</div></td>
                  <td>{tglPendek(it.checkOut)}<div style={{ color: '#666', fontSize: 11 }}>{it.jamCheckOut}</div></td>
                  <td style={{ textAlign: 'center' }}>{it.malam > 0 ? `${it.malam} mlm` : '1 hari'}</td>
                  <td style={{ textAlign: 'right' }}>{rupiah(it.harga)}</td>
                  <td style={{ textAlign: 'right' }}>{it.diskon > 0 ? rupiah(it.diskon) : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{rupiah(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <table style={{ width: 260 }}>
              <tbody>
                <Baris k="Total Harga" v={rupiah(h.total)} />
                <Baris k="Terbayar" v={rupiah(h.terbayar)} />
                <Baris k="Sisa" v={rupiah(Math.max(0, h.sisa))} />
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 15, marginTop: 6 }}>
            {h.statusBayar === 'Lunas' ? 'LUNAS' : h.statusBayar === 'DP' ? 'DP' : 'BELUM BAYAR'}
          </div>

          <div className="kw-sep" />

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700 }}>REKENING PEMBAYARAN</div>
              <div>{s.bank}</div>
              <div>NAMA&nbsp;&nbsp;&nbsp;: {s.namaRekening}</div>
              <div>NO REK : {s.noRekening || '(belum diisi)'}</div>
              <div style={{ marginTop: 6 }}>Kontak: {s.whatsapp}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>{s.ttdJabatan}</div>
              <div style={{ height: 44 }} />
              <div style={{ fontWeight: 700, borderTop: '1px solid #999', paddingTop: 4 }}>{s.ttdNama}</div>
            </div>
          </div>

          {booking.catatan && (
            <div style={{ marginTop: 12, fontStyle: 'italic', color: '#555' }}>Catatan: {booking.catatan}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Baris({ k, v }) {
  return (
    <tr>
      <td style={{ color: '#555', width: 120 }}>{k}</td>
      <td style={{ fontWeight: 600 }}>: {v}</td>
    </tr>
  );
}
