import React, { useMemo, useState } from 'react';
import { unitTerisi } from './booking';
import { hariIni, rupiah, tglPendek, waLink } from './format';
import { LAYANAN } from './seed';
import { Badge, Kosong, useToast } from './ui';

export default function KatalogPage({ pengaturan, units, bookings }) {
  const toast = useToast();
  const [layanan, setLayanan] = useState('semua');
  const [cari, setCari] = useState('');
  const hari = hariIni();

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return (units || [])
      .filter((u) => u.aktif !== false)
      .filter((u) => layanan === 'semua' || u.layanan === layanan)
      .filter((u) => !q || `${u.nomor} ${u.properti} ${u.mitra}`.toLowerCase().includes(q))
      .map((u) => ({ ...u, isi: unitTerisi(bookings, u.nomor, hari) }))
      .sort((a, b) => String(a.properti).localeCompare(String(b.properti)) || String(a.nomor).localeCompare(String(b.nomor)));
  }, [units, bookings, layanan, cari, hari]);

  const terisi = daftar.filter((u) => u.isi).length;

  function bagikan(u) {
    const teks = [
      `${pengaturan.namaPerusahaan}`,
      `Unit ${u.nomor}${u.tipe ? ` (${u.tipe})` : ''} — ${u.properti}`,
      u.hargaDefault ? `Harga mulai ${rupiah(u.hargaDefault)} / malam` : '',
      `Info & booking: ${pengaturan.whatsapp} · ${pengaturan.instagram}`
    ].filter(Boolean).join('\n');
    navigator.clipboard
      ? navigator.clipboard.writeText(teks).then(() => toast('Teks promosi disalin.'))
      : window.prompt('Salin teks:', teks);
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="row wrap">
          <input className="grow" style={{ minWidth: 180 }} placeholder="Cari unit, properti, atau mitra" value={cari} onChange={(e) => setCari(e.target.value)} />
          <select value={layanan} onChange={(e) => setLayanan(e.target.value)} style={{ width: 'auto' }}>
            <option value="semua">Semua layanan</option>
            {LAYANAN.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="small dim mt16">
          {daftar.length} unit aktif · {terisi} terisi hari ini · {daftar.length - terisi} kosong
        </div>
      </div>

      {daftar.length === 0 ? (
        <Kosong pesan="Tidak ada unit yang cocok." />
      ) : (
        <div className="grid grid-3">
          {daftar.map((u) => (
            <div className="card" key={u.id}>
              <div className="spread">
                <div>
                  <h3 className="mono">{u.nomor}</h3>
                  <div className="small dim">{u.tipe}{u.properti ? ` · ${u.properti}` : ''}</div>
                </div>
                {u.isi ? <Badge jenis="bad" anak="Terisi" /> : <Badge jenis="ok" anak="Kosong" />}
              </div>

              <div className="small mt16">
                <div className="spread"><span className="dim">Jenis</span><span>{u.jenis === 'inti' ? 'Unit inti' : 'Unit mitra'}</span></div>
                {u.mitra && <div className="spread"><span className="dim">Mitra</span><span>{u.mitra}</span></div>}
                <div className="spread"><span className="dim">Harga default</span><span className="mono">{u.hargaDefault ? rupiah(u.hargaDefault) : '—'}</span></div>
                {u.isi && (
                  <div className="spread"><span className="dim">Tamu</span><span>{u.isi.namaTamu} s/d {tglPendek(u.isi.checkOut)}</span></div>
                )}
              </div>

              <div className="row mt16">
                <button className="btn kecil grow" onClick={() => bagikan(u)}>Salin teks promosi</button>
                {u.kontakMitra && (
                  <a className="btn kecil" href={waLink(u.kontakMitra, `Halo, terkait unit ${u.nomor}`)} target="_blank" rel="noreferrer">WA mitra</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
