import React, { useMemo, useState } from 'react';
import { COL, tambah, ubah, hapus, catatLog } from './db';
import { rupiah, n, waLink } from './format';
import { LAYANAN, STATUS_PROSPEK } from './seed';
import { Modal, Field, InputRupiah, Konfirmasi, Kosong, Badge, useToast } from './ui';

export default function MitraPage({ user, units, prospects }) {
  const [tab, setTab] = useState('unit');
  return (
    <div className="stack">
      <div className="tabbar">
        <button className={tab === 'unit' ? 'aktif' : ''} onClick={() => setTab('unit')}>Unit Aktif</button>
        <button className={tab === 'prospek' ? 'aktif' : ''} onClick={() => setTab('prospek')}>Prospek Owner</button>
      </div>
      {tab === 'unit' ? <DaftarUnit user={user} units={units} /> : <Prospek user={user} prospects={prospects} />}
    </div>
  );
}

/* =================== UNIT =================== */
function DaftarUnit({ user, units }) {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [konfirm, setKonfirm] = useState(null);
  const [jenis, setJenis] = useState('semua');
  const [cari, setCari] = useState('');

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return (units || [])
      .filter((u) => jenis === 'semua' || u.jenis === jenis)
      .filter((u) => !q || `${u.nomor} ${u.properti} ${u.mitra}`.toLowerCase().includes(q))
      .sort((a, b) => String(a.properti).localeCompare(String(b.properti)) || String(a.nomor).localeCompare(String(b.nomor)));
  }, [units, jenis, cari]);

  async function simpan(data, id) {
    try {
      if (id) { await ubah(COL.units, id, data); await catatLog(user, 'Ubah unit', data.nomor); }
      else { await tambah(COL.units, data); await catatLog(user, 'Tambah unit', data.nomor); }
      toast('Unit tersimpan.');
      setForm(null);
    } catch { toast('Gagal menyimpan unit.', 'err'); }
  }

  const jmlInti = (units || []).filter((u) => u.jenis === 'inti').length;
  const jmlMitra = (units || []).filter((u) => u.jenis === 'mitra').length;

  return (
    <div className="stack">
      <div className="card">
        <div className="row wrap">
          <input className="grow" style={{ minWidth: 160 }} placeholder="Cari unit atau mitra" value={cari} onChange={(e) => setCari(e.target.value)} />
          <select value={jenis} onChange={(e) => setJenis(e.target.value)} style={{ width: 'auto' }}>
            <option value="semua">Semua jenis</option>
            <option value="inti">Unit inti</option>
            <option value="mitra">Unit mitra</option>
          </select>
          <button className="btn primary" onClick={() => setForm({})}>+ Unit</button>
        </div>
        <div className="small dim mt16">{jmlInti} unit inti · {jmlMitra} unit mitra</div>
      </div>

      <div className="card">
        {tampil.length === 0 ? (
          <Kosong pesan="Belum ada unit." aksi={<button className="btn primary" onClick={() => setForm({})}>Tambah unit</button>} />
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead>
                <tr><th>Unit</th><th>Properti</th><th>Jenis</th><th>Mitra</th><th>Kesepakatan</th><th className="num">Harga default</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {tampil.map((u) => (
                  <tr key={u.id}>
                    <td><span className="mono bold">{u.nomor}</span><div className="small dim">{u.tipe} · {u.layanan}</div></td>
                    <td className="small">{u.properti}</td>
                    <td>{u.jenis === 'inti' ? <Badge jenis="info" anak="Inti" /> : <Badge jenis="netral" anak="Mitra" />}</td>
                    <td className="small">
                      {u.mitra || '—'}
                      {u.kontakMitra && (
                        <div><a className="small" href={waLink(u.kontakMitra, `Halo, terkait unit ${u.nomor}`)} target="_blank" rel="noreferrer">{u.kontakMitra}</a></div>
                      )}
                    </td>
                    <td className="small">{u.komisi || '—'}</td>
                    <td className="num">{u.hargaDefault ? rupiah(u.hargaDefault) : '—'}</td>
                    <td>{u.aktif === false ? <Badge jenis="bad" anak="Nonaktif" /> : <Badge jenis="ok" anak="Aktif" />}</td>
                    <td className="right nowrap">
                      <button className="btn kecil" onClick={() => setForm(u)}>Ubah</button>{' '}
                      <button className="btn kecil danger" onClick={() => setKonfirm(u)}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && <FormUnit awal={form.id ? form : null} onSimpan={simpan} onTutup={() => setForm(null)} />}

      {konfirm && (
        <Konfirmasi
          judul="Hapus unit"
          pesan={`Unit ${konfirm.nomor} akan dihapus dari daftar. Booking lama tetap tersimpan. Lanjutkan?`}
          onYa={async () => {
            await hapus(COL.units, konfirm.id);
            await catatLog(user, 'Hapus unit', konfirm.nomor);
            toast('Unit dihapus.');
            setKonfirm(null);
          }}
          onBatal={() => setKonfirm(null)}
        />
      )}
    </div>
  );
}

function FormUnit({ awal, onSimpan, onTutup, kunciNama }) {
  const [f, setF] = useState({
    nomor: awal?.nomor || '', tipe: awal?.tipe || '', properti: awal?.properti || '',
    jenis: awal?.jenis || 'mitra', layanan: awal?.layanan || 'Apartemen',
    mitra: awal?.mitra || '', kontakMitra: awal?.kontakMitra || '', komisi: awal?.komisi || '',
    hargaDefault: n(awal?.hargaDefault), aktif: awal?.aktif !== false
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  return (
    <Modal
      judul={awal ? `Ubah Unit ${awal.nomor}` : 'Unit Baru'}
      onTutup={onTutup}
      lebar={620}
      footer={
        <>
          <button className="btn" onClick={onTutup}>Batal</button>
          <button className="btn primary" onClick={() => f.nomor.trim() && onSimpan({ ...f, nomor: f.nomor.trim() }, awal?.id)}>Simpan</button>
        </>
      }
      anak={
        <div className="stack">
          <div className="f-grid">
            <Field label="Nomor / nama unit">
              <input value={f.nomor} onChange={(e) => set('nomor', e.target.value)} readOnly={kunciNama} autoFocus />
            </Field>
            <Field label="Tipe"><input value={f.tipe} onChange={(e) => set('tipe', e.target.value)} placeholder="2BR, Studio, Villa…" /></Field>
            <Field label="Properti"><input value={f.properti} onChange={(e) => set('properti', e.target.value)} placeholder="Delft Apartemen CPI" /></Field>
          </div>
          <div className="f-grid">
            <Field label="Jenis">
              <select value={f.jenis} onChange={(e) => set('jenis', e.target.value)}>
                <option value="inti">Unit inti (dikelola sendiri)</option>
                <option value="mitra">Unit mitra (milik owner lain)</option>
              </select>
            </Field>
            <Field label="Layanan">
              <select value={f.layanan} onChange={(e) => set('layanan', e.target.value)}>
                {LAYANAN.map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Harga default"><InputRupiah nilai={f.hargaDefault} onUbah={(v) => set('hargaDefault', v)} /></Field>
          </div>
          {f.jenis === 'mitra' && (
            <div className="f-grid">
              <Field label="Nama mitra / pemilik"><input value={f.mitra} onChange={(e) => set('mitra', e.target.value)} /></Field>
              <Field label="Kontak mitra"><input value={f.kontakMitra} onChange={(e) => set('kontakMitra', e.target.value)} inputMode="tel" /></Field>
              <Field label="Kesepakatan komisi"><input value={f.komisi} onChange={(e) => set('komisi', e.target.value)} placeholder="Contoh: setoran 350rb/malam" /></Field>
            </div>
          )}
          <label className="row">
            <input type="checkbox" checked={f.aktif} onChange={(e) => set('aktif', e.target.checked)} />
            <span>Unit aktif (muncul di katalog dan pilihan booking)</span>
          </label>
        </div>
      }
    />
  );
}

/* =================== PROSPEK =================== */
function Prospek({ user, prospects }) {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [konfirm, setKonfirm] = useState(null);
  const [aktivasi, setAktivasi] = useState(null);

  const perStatus = useMemo(() => {
    const p = Object.fromEntries(STATUS_PROSPEK.map((s) => [s, 0]));
    for (const x of prospects || []) if (p[x.status] !== undefined) p[x.status] += 1;
    return p;
  }, [prospects]);

  async function simpan(data, id) {
    try {
      if (id) { await ubah(COL.prospects, id, data); await catatLog(user, 'Ubah prospek', data.nama); }
      else { await tambah(COL.prospects, data); await catatLog(user, 'Tambah prospek', data.nama); }
      toast('Prospek tersimpan.');
      setForm(null);
    } catch { toast('Gagal menyimpan prospek.', 'err'); }
  }

  async function ubahStatus(p, status) {
    await ubah(COL.prospects, p.id, { status });
    await catatLog(user, 'Ubah status prospek', `${p.nama} → ${status}`);
    if (status === 'Aktif') setAktivasi(p);
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="row wrap">
          {STATUS_PROSPEK.map((s) => (
            <span key={s} className="badge netral">{s}: {perStatus[s]}</span>
          ))}
          <div className="grow" />
          <button className="btn primary" onClick={() => setForm({})}>+ Prospek</button>
        </div>
        <div className="small dim mt16">
          Pertumbuhan datang dari menambah unit mitra, bukan membeli unit sendiri. Begitu status jadi <b>Aktif</b>, unitnya langsung didaftarkan supaya tidak perlu input dua kali.
        </div>
      </div>

      <div className="card">
        {(prospects || []).length === 0 ? (
          <Kosong pesan="Belum ada prospek pemilik unit." aksi={<button className="btn primary" onClick={() => setForm({})}>Tambah prospek</button>} />
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Nama</th><th>Kontak</th><th>Properti / unit</th><th>Status</th><th>Catatan</th><th></th></tr></thead>
              <tbody>
                {(prospects || []).map((p) => (
                  <tr key={p.id}>
                    <td className="bold">{p.nama}</td>
                    <td className="small">
                      {p.kontak ? <a href={waLink(p.kontak, `Halo ${p.nama},`)} target="_blank" rel="noreferrer">{p.kontak}</a> : '—'}
                    </td>
                    <td className="small">{p.properti || '—'}{p.unitRencana ? ` · ${p.unitRencana}` : ''}</td>
                    <td>
                      <select value={p.status} onChange={(e) => ubahStatus(p, e.target.value)} style={{ width: 'auto', padding: '5px 8px', fontSize: 13 }}>
                        {STATUS_PROSPEK.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="small dim">{p.catatan || '—'}</td>
                    <td className="right nowrap">
                      <button className="btn kecil" onClick={() => setForm(p)}>Ubah</button>{' '}
                      <button className="btn kecil danger" onClick={() => setKonfirm(p)}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && <FormProspek awal={form.id ? form : null} onSimpan={simpan} onTutup={() => setForm(null)} />}

      {aktivasi && (
        <FormUnit
          awal={{
            nomor: aktivasi.unitRencana || '',
            properti: aktivasi.properti || '',
            jenis: 'mitra',
            mitra: aktivasi.nama,
            kontakMitra: aktivasi.kontak,
            layanan: 'Apartemen',
            aktif: true
          }}
          onSimpan={async (data) => {
            await tambah(COL.units, data);
            await catatLog(user, 'Aktifkan mitra jadi unit', `${data.nomor} · ${aktivasi.nama}`);
            toast(`Unit ${data.nomor} masuk ke daftar unit aktif.`);
            setAktivasi(null);
          }}
          onTutup={() => setAktivasi(null)}
        />
      )}

      {konfirm && (
        <Konfirmasi
          judul="Hapus prospek"
          pesan={`Prospek ${konfirm.nama} akan dihapus. Lanjutkan?`}
          onYa={async () => {
            await hapus(COL.prospects, konfirm.id);
            await catatLog(user, 'Hapus prospek', konfirm.nama);
            toast('Prospek dihapus.');
            setKonfirm(null);
          }}
          onBatal={() => setKonfirm(null)}
        />
      )}
    </div>
  );
}

function FormProspek({ awal, onSimpan, onTutup }) {
  const [f, setF] = useState({
    nama: awal?.nama || '', kontak: awal?.kontak || '', properti: awal?.properti || '',
    unitRencana: awal?.unitRencana || '', status: awal?.status || 'Prospek', catatan: awal?.catatan || ''
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  return (
    <Modal
      judul={awal ? 'Ubah Prospek' : 'Prospek Baru'}
      onTutup={onTutup}
      lebar={560}
      footer={
        <>
          <button className="btn" onClick={onTutup}>Batal</button>
          <button className="btn primary" onClick={() => f.nama.trim() && onSimpan({ ...f, nama: f.nama.trim() }, awal?.id)}>Simpan</button>
        </>
      }
      anak={
        <div className="stack">
          <div className="f-grid">
            <Field label="Nama pemilik"><input value={f.nama} onChange={(e) => set('nama', e.target.value)} autoFocus /></Field>
            <Field label="Kontak"><input value={f.kontak} onChange={(e) => set('kontak', e.target.value)} inputMode="tel" /></Field>
          </div>
          <div className="f-grid">
            <Field label="Properti"><input value={f.properti} onChange={(e) => set('properti', e.target.value)} placeholder="Delft, Vida View…" /></Field>
            <Field label="Nomor unit yang ditawarkan"><input value={f.unitRencana} onChange={(e) => set('unitRencana', e.target.value)} /></Field>
            <Field label="Status">
              <select value={f.status} onChange={(e) => set('status', e.target.value)}>
                {STATUS_PROSPEK.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Catatan"><textarea value={f.catatan} onChange={(e) => set('catatan', e.target.value)} /></Field>
        </div>
      }
    />
  );
}
