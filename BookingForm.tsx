import React, { useEffect, useMemo, useRef, useState } from 'react';
import { COL, tambah, ubah, catatLog } from './db';
import { hitungBooking, itemBaru } from './booking';
import { rupiah, hariIni, n } from './format';
import { LAYANAN, SUMBER_BOOKING, STATUS_SETORAN } from './seed';
import { Modal, Field, InputRupiah, useToast } from './ui';

const KETIK_MANUAL = '__manual__';

export default function BookingForm({ awal, units, pengaturan, user, onTutup }) {
  const toast = useToast();
  const edit = !!awal?.id;

  const [namaTamu, setNamaTamu] = useState(awal?.namaTamu || '');
  const [noTelepon, setNoTelepon] = useState(awal?.noTelepon || '');
  const [alamat, setAlamat] = useState(awal?.alamat || '');
  const [sumberBooking, setSumberBooking] = useState(awal?.sumberBooking || 'Instagram');
  const [statusSetoran, setStatusSetoran] = useState(awal?.statusSetoran || 'Belum');
  const [catatan, setCatatan] = useState(awal?.catatan || '');
  const [dp, setDp] = useState(n(awal?.dp));
  const [pelunasan, setPelunasan] = useState(n(awal?.pelunasan));
  const [items, setItems] = useState(
    awal?.items?.length ? awal.items.map((i) => ({ ...i })) : [itemBaru(pengaturan)]
  );
  const [simpan, setSimpan] = useState(false);

  const unitAktif = useMemo(() => (units || []).filter((u) => u.aktif !== false), [units]);
  const h = useMemo(() => hitungBooking(items, dp, pelunasan), [items, dp, pelunasan]);

  function ubahItem(idx, patch) {
    setItems((list) => list.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function pilihUnit(idx, nilai) {
    if (nilai === KETIK_MANUAL) {
      ubahItem(idx, { unitNomor: '', manual: true });
      return;
    }
    const u = unitAktif.find((x) => x.nomor === nilai);
    if (!u) { ubahItem(idx, { unitNomor: nilai }); return; }
    const patch = {
      unitNomor: u.nomor,
      unitTipe: u.tipe || '',
      properti: u.properti || '',
      layanan: u.layanan || 'Apartemen',
      jenisUnit: u.jenis || 'mitra',
      manual: false
    };
    if (!n(items[idx].harga) && n(u.hargaDefault)) {
      patch.harga = n(u.hargaDefault);
      patch.hargaDariKatalog = true;
    }
    ubahItem(idx, patch);
  }

  async function kirim(e) {
    e.preventDefault();
    if (!namaTamu.trim()) return toast('Nama tamu belum diisi.', 'err');
    for (const [i, it] of items.entries()) {
      if (!it.unitNomor) return toast(`Item ${i + 1}: unit belum dipilih.`, 'err');
      if (!it.checkIn || !it.checkOut) return toast(`Item ${i + 1}: tanggal belum lengkap.`, 'err');
      if (it.checkOut < it.checkIn) return toast(`Item ${i + 1}: check-out lebih awal dari check-in.`, 'err');
    }

    const data = {
      namaTamu: namaTamu.trim(),
      noTelepon: noTelepon.trim(),
      alamat: alamat.trim(),
      sumberBooking,
      statusSetoran,
      catatan: catatan.trim(),
      items: h.items.map((it) => ({
        unitNomor: it.unitNomor, unitTipe: it.unitTipe || '', properti: it.properti || '',
        layanan: it.layanan || 'Apartemen', jenisUnit: it.jenisUnit || 'mitra',
        checkIn: it.checkIn, checkOut: it.checkOut,
        jamCheckIn: it.jamCheckIn || '', jamCheckOut: it.jamCheckOut || '',
        malam: n(it.malam), harga: n(it.harga), diskon: n(it.diskon),
        subtotal: n(it.subtotal), setoranOwner: n(it.setoranOwner)
      })),
      totalBruto: h.totalBruto,
      totalDiskon: h.totalDiskon,
      total: h.total,
      totalSetoran: h.totalSetoran,
      dp: n(dp),
      pelunasan: n(pelunasan),
      sisa: h.sisa,
      statusBayar: h.statusBayar,
      tanggalKwitansi: awal?.tanggalKwitansi || hariIni()
    };

    setSimpan(true);
    try {
      if (edit) {
        await ubah(COL.bookings, awal.id, data);
        await catatLog(user, 'Ubah booking', `${data.namaTamu} · ${data.items.length} item`);
        toast('Booking diperbarui.');
      } else {
        await tambah(COL.bookings, { ...data, dibuatOleh: user.username });
        await catatLog(user, 'Buat booking', `${data.namaTamu} · ${data.items.length} item`);
        toast('Booking tersimpan.');
      }
      onTutup();
    } catch (err) {
      console.error(err);
      toast('Gagal menyimpan. Cek koneksi lalu coba lagi.', 'err');
    } finally {
      setSimpan(false);
    }
  }

  return (
    <Modal
      judul={edit ? 'Ubah Booking' : 'Booking Baru'}
      onTutup={onTutup}
      lebar={860}
      footer={
        <>
          <button className="btn" onClick={onTutup}>Batal</button>
          <button className="btn primary" onClick={kirim} disabled={simpan}>
            {simpan ? 'Menyimpan…' : 'Simpan Booking'}
          </button>
        </>
      }
      anak={
        <form onSubmit={kirim} className="stack">
          {/* Data tamu */}
          <div className="f-grid">
            <Field label="Nama tamu">
              <input value={namaTamu} onChange={(e) => setNamaTamu(e.target.value)} autoFocus />
            </Field>
            <Field label="No WhatsApp">
              <input value={noTelepon} onChange={(e) => setNoTelepon(e.target.value)} inputMode="tel" placeholder="0812..." />
            </Field>
            <Field label="Sumber booking">
              <select value={sumberBooking} onChange={(e) => setSumberBooking(e.target.value)}>
                {SUMBER_BOOKING.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Alamat (opsional)">
            <input value={alamat} onChange={(e) => setAlamat(e.target.value)} />
          </Field>

          {/* Item */}
          <div className="spread mt8">
            <h3>Unit yang dipesan</h3>
            <button type="button" className="btn kecil" onClick={() => setItems((l) => [...l, itemBaru(pengaturan)])}>
              + Tambah unit
            </button>
          </div>

          {h.items.map((it, idx) => (
            <div className="item-box" key={idx}>
              <div className="item-head">
                <span className="item-no">ITEM {idx + 1}</span>
                {items.length > 1 && (
                  <button type="button" className="btn kecil danger" onClick={() => setItems((l) => l.filter((_, i) => i !== idx))}>
                    Hapus item
                  </button>
                )}
              </div>

              <div className="stack">
                <div className="f-grid">
                  <Field label="Unit">
                    {it.manual ? (
                      <input
                        value={it.unitNomor}
                        onChange={(e) => ubahItem(idx, { unitNomor: e.target.value })}
                        placeholder="Ketik nama unit"
                      />
                    ) : (
                      <PilihUnit
                        nilai={it.unitNomor}
                        unitAktif={unitAktif}
                        onPilih={(nomor) => pilihUnit(idx, nomor)}
                        onManual={() => pilihUnit(idx, KETIK_MANUAL)}
                      />
                    )}
                  </Field>
                  <Field label="Layanan">
                    <select value={it.layanan} onChange={(e) => ubahItem(idx, { layanan: e.target.value })}>
                      {LAYANAN.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </Field>
                  {it.manual && (
                    <Field label="Kembali ke daftar unit">
                      <button type="button" className="btn kecil" onClick={() => ubahItem(idx, { manual: false, unitNomor: '' })}>
                        Pilih dari daftar
                      </button>
                    </Field>
                  )}
                </div>

                <div className="f-grid">
                  <Field label="Check-in">
                    <input type="date" value={it.checkIn} onChange={(e) => ubahItem(idx, { checkIn: e.target.value })} />
                  </Field>
                  <Field label="Jam masuk">
                    <input type="time" value={it.jamCheckIn} onChange={(e) => ubahItem(idx, { jamCheckIn: e.target.value })} />
                  </Field>
                  <Field label="Check-out">
                    <input type="date" value={it.checkOut} onChange={(e) => ubahItem(idx, { checkOut: e.target.value })} />
                  </Field>
                  <Field label="Jam keluar">
                    <input type="time" value={it.jamCheckOut} onChange={(e) => ubahItem(idx, { jamCheckOut: e.target.value })} />
                  </Field>
                  <Field label="Malam (otomatis)">
                    <input value={it.malam} readOnly className="mono" />
                  </Field>
                </div>

                <div className="f-grid">
                  <Field label="Harga total item (bukan per malam)">
                    <InputRupiah nilai={it.harga} onUbah={(v) => ubahItem(idx, { harga: v, hargaDariKatalog: false })} />
                  </Field>
                  <Field label="Diskon item">
                    <InputRupiah nilai={it.diskon} onUbah={(v) => ubahItem(idx, { diskon: v })} />
                  </Field>
                  <Field label="Setoran ke pemilik unit">
                    <InputRupiah nilai={it.setoranOwner} onUbah={(v) => ubahItem(idx, { setoranOwner: v })} />
                  </Field>
                  <Field label="Subtotal item">
                    <input value={rupiah(it.subtotal)} readOnly className="mono" />
                  </Field>
                </div>

                {it.hargaDariKatalog && n(it.malam) > 1 && (
                  <div className="small" style={{ color: 'var(--warn, #b26a00)' }}>
                    Harga {rupiah(it.harga)} terisi otomatis dari harga katalog unit ini, yang biasanya
                    harga per malam. Periode ini {it.malam} malam — pastikan angka di atas sudah berupa
                    harga total, bukan harga semalam.
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Pembayaran */}
          <h3 className="mt8">Pembayaran</h3>
          <div className="f-grid">
            <Field label="DP">
              <InputRupiah nilai={dp} onUbah={setDp} />
            </Field>
            <Field label="Pelunasan">
              <InputRupiah nilai={pelunasan} onUbah={setPelunasan} />
            </Field>
            <Field label="Status setoran ke owner">
              <select value={statusSetoran} onChange={(e) => setStatusSetoran(e.target.value)}>
                {STATUS_SETORAN.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Catatan">
            <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </Field>

          {/* Ringkasan */}
          <div className="card" style={{ background: 'var(--bg-soft)' }}>
            <div className="grid grid-3">
              <Ring label="Total malam" nilai={h.totalMalam} />
              <Ring label="Total harga" nilai={rupiah(h.total)} />
              <Ring label="Terbayar" nilai={rupiah(h.terbayar)} />
              <Ring label="Sisa tagihan" nilai={rupiah(Math.max(0, h.sisa))} />
              <Ring label="Total setoran owner" nilai={rupiah(h.totalSetoran)} />
              <Ring label="Status bayar" nilai={h.statusBayar} />
            </div>
          </div>
        </form>
      }
    />
  );
}

function Ring({ label, nilai }) {
  return (
    <div>
      <div className="tiny dim">{label}</div>
      <div className="mono bold" style={{ fontSize: 15 }}>{nilai}</div>
    </div>
  );
}

/**
 * Pemilih unit yang bisa DIKETIK untuk mencari sekaligus DISCROLL untuk memilih.
 * Dibuat sendiri (bukan <select> bawaan) karena di HP daftar unit yang panjang
 * hanya bisa digeser satu per satu dan tidak bisa dicari.
 */
function PilihUnit({ nilai, unitAktif, onPilih, onManual }) {
  const [buka, setBuka] = useState(false);
  const [cari, setCari] = useState('');
  const [sorot, setSorot] = useState(0);
  const kotak = useRef(null);
  const daftarRef = useRef(null);

  const terpilih = useMemo(
    () => (unitAktif || []).find((u) => u.nomor === nilai) || null,
    [unitAktif, nilai]
  );

  function labelUnit(u) {
    const bagian = [u.nomor];
    if (u.tipe) bagian.push(u.tipe);
    if (u.properti) bagian.push(u.properti);
    return bagian.filter(Boolean).join(' · ');
  }

  // Pencarian per kata: "1521 delft" tetap ketemu walau urutannya berbeda.
  const hasil = useMemo(() => {
    const kata = cari.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const semua = unitAktif || [];
    if (kata.length === 0) return semua;
    const cocok = semua.filter((u) => {
      const teks = `${u.nomor || ''} ${u.tipe || ''} ${u.properti || ''}`.toLowerCase();
      return kata.every((k) => teks.includes(k));
    });
    // Yang nomornya diawali kata pencarian ditaruh paling atas.
    const awal = cari.trim().toLowerCase();
    return cocok.sort((a, b) => {
      const pa = String(a.nomor || '').toLowerCase().startsWith(awal) ? 0 : 1;
      const pb = String(b.nomor || '').toLowerCase().startsWith(awal) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return String(a.nomor || '').localeCompare(String(b.nomor || ''), 'id', { numeric: true });
    });
  }, [unitAktif, cari]);

  // Tutup kalau menyentuh area di luar kotak.
  useEffect(() => {
    if (!buka) return undefined;
    function diLuar(e) {
      if (kotak.current && !kotak.current.contains(e.target)) setBuka(false);
    }
    document.addEventListener('pointerdown', diLuar);
    return () => document.removeEventListener('pointerdown', diLuar);
  }, [buka]);

  // Jaga supaya baris yang sedang disorot selalu kelihatan saat pakai panah.
  useEffect(() => {
    if (!buka || !daftarRef.current) return;
    const baris = daftarRef.current.children[sorot];
    if (baris && baris.scrollIntoView) baris.scrollIntoView({ block: 'nearest' });
  }, [sorot, buka]);

  function bukaDaftar() {
    setCari('');
    setSorot(0);
    setBuka(true);
  }

  function ambil(u) {
    onPilih(u.nomor);
    setBuka(false);
    setCari('');
  }

  function tombol(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!buka) return bukaDaftar();
      setSorot((s) => Math.min(s + 1, Math.max(0, hasil.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSorot((s) => Math.max(0, s - 1));
    } else if (e.key === 'Enter') {
      if (buka && hasil[sorot]) {
        e.preventDefault();
        ambil(hasil[sorot]);
      }
    } else if (e.key === 'Escape') {
      setBuka(false);
    }
  }

  const gayaDaftar = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    zIndex: 50,
    maxHeight: 260,
    overflowY: 'auto',
    background: 'var(--card)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
    WebkitOverflowScrolling: 'touch'
  };

  const gayaBaris = (aktif) => ({
    padding: '10px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--line)',
    background: aktif ? 'var(--accent)' : 'transparent',
    color: aktif ? '#fff' : 'var(--text)'
  });

  return (
    <div ref={kotak} style={{ position: 'relative' }}>
      <input
        value={buka ? cari : terpilih ? labelUnit(terpilih) : nilai || ''}
        onChange={(e) => { setCari(e.target.value); setSorot(0); if (!buka) setBuka(true); }}
        onFocus={bukaDaftar}
        onKeyDown={tombol}
        placeholder="Ketik nomor unit atau nama properti"
        autoComplete="off"
      />

      {buka && (
        <div style={gayaDaftar} ref={daftarRef}>
          {hasil.length === 0 && (
            <div style={{ padding: '10px 12px' }} className="small dim">
              Unit "{cari}" tidak ada di daftar.
            </div>
          )}

          {hasil.map((u, i) => (
            <div
              key={u.id}
              style={gayaBaris(i === sorot)}
              onPointerDown={(e) => { e.preventDefault(); ambil(u); }}
              onMouseEnter={() => setSorot(i)}
            >
              <div className="bold">{u.nomor}{u.tipe ? ` · ${u.tipe}` : ''}</div>
              {u.properti && <div className="tiny dim">{u.properti}</div>}
            </div>
          ))}

          <div
            style={{ padding: '10px 12px', cursor: 'pointer', color: 'var(--accent)' }}
            onPointerDown={(e) => { e.preventDefault(); setBuka(false); onManual(); }}
          >
            + Ketik manual
          </div>
        </div>
      )}
    </div>
  );
}
