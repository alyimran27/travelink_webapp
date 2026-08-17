import React, { useMemo, useState } from 'react';
import { COL, tambah, ubah, hapus, catatLog, ambilSemua } from './db';
import { ratakanItem } from './booking';
import { rupiah, ribuan, bulanKey, labelBulan, hariIni, n, BULAN } from './format';
import { KATEGORI_BIAYA } from './seed';
import { exportSemua } from './excel';
import { Modal, Field, InputRupiah, Konfirmasi, Kosong, useToast, Kpi } from './ui';

const UMUM = '';

export default function ReportPage({ user, units, bookings, expenses, prospects }) {
  const [tab, setTab] = useState('bulanan');
  const toast = useToast();

  return (
    <div className="stack">
      <div className="tabbar">
        <button className={tab === 'bulanan' ? 'aktif' : ''} onClick={() => setTab('bulanan')}>Laporan Bulanan</button>
        <button className={tab === 'tahunan' ? 'aktif' : ''} onClick={() => setTab('tahunan')}>Laporan Tahunan</button>
        <button className={tab === 'biaya' ? 'aktif' : ''} onClick={() => setTab('biaya')}>Biaya</button>
      </div>

      {tab === 'bulanan' && <LaporanBulanan bookings={bookings} expenses={expenses} />}
      {tab === 'tahunan' && <LaporanTahunan bookings={bookings} expenses={expenses} />}
      {tab === 'biaya' && <Biaya user={user} units={units} expenses={expenses} />}

      <div className="card">
        <div className="spread">
          <div>
            <h3>Backup manual</h3>
            <div className="small dim">Firebase paket gratis tidak punya backup otomatis. Unduh Excel ini rutin, minimal sebulan sekali.</div>
          </div>
          <button
            className="btn primary"
            onClick={async () => {
              const users = await ambilSemua(COL.users);
              exportSemua({ bookings, units, expenses, prospects, users });
              await catatLog(user, 'Export Excel', 'backup manual');
              toast('File Excel terunduh.');
            }}
          >
            Unduh Excel
          </button>
        </div>
      </div>
    </div>
  );
}

/* =================== LAPORAN BULANAN =================== */
function LaporanBulanan({ bookings, expenses }) {
  const semuaItem = useMemo(() => ratakanItem(bookings), [bookings]);
  const daftarBulan = useMemo(() => {
    const s = new Set(semuaItem.map((i) => i.bulan).filter(Boolean));
    for (const e of expenses || []) if (e.tanggal) s.add(bulanKey(e.tanggal));
    const arr = [...s].sort().reverse();
    return arr.length ? arr : [bulanKey(hariIni())];
  }, [semuaItem, expenses]);

  const [bulan, setBulan] = useState(daftarBulan[0]);
  const [drill, setDrill] = useState(null);

  const item = semuaItem.filter((i) => i.bulan === bulan);
  const biayaBulan = (expenses || []).filter((e) => bulanKey(e.tanggal) === bulan);

  const perUnit = useMemo(() => {
    const peta = {};
    for (const i of item) {
      const k = i.unitNomor || '(tanpa unit)';
      peta[k] = peta[k] || { unit: k, malam: 0, nilai: 0, setoran: 0, biaya: 0, jml: 0 };
      peta[k].malam += n(i.malam);
      peta[k].nilai += n(i.subtotal);
      peta[k].setoran += n(i.setoranOwner);
      peta[k].jml += 1;
    }
    for (const e of biayaBulan) {
      if (!e.unitNomor) continue;
      peta[e.unitNomor] = peta[e.unitNomor] || { unit: e.unitNomor, malam: 0, nilai: 0, setoran: 0, biaya: 0, jml: 0 };
      peta[e.unitNomor].biaya += n(e.nominal);
    }
    return Object.values(peta)
      .map((r) => ({ ...r, laba: r.nilai - r.setoran, kas: r.nilai - r.setoran - r.biaya, margin: r.nilai ? ((r.nilai - r.setoran) / r.nilai) * 100 : 0 }))
      .sort((a, b) => b.nilai - a.nilai);
  }, [item, biayaBulan]);

  const biayaUmum = biayaBulan.filter((e) => !e.unitNomor);
  const totalUmum = biayaUmum.reduce((a, e) => a + n(e.nominal), 0);
  const t = perUnit.reduce(
    (a, r) => ({ malam: a.malam + r.malam, nilai: a.nilai + r.nilai, setoran: a.setoran + r.setoran, biaya: a.biaya + r.biaya }),
    { malam: 0, nilai: 0, setoran: 0, biaya: 0 }
  );
  const labaTotal = t.nilai - t.setoran;
  const kasBersih = labaTotal - t.biaya - totalUmum;

  return (
    <div className="stack">
      <div className="card">
        <div className="row wrap">
          <select value={bulan} onChange={(e) => setBulan(e.target.value)} style={{ width: 'auto' }}>
            {daftarBulan.map((k) => <option key={k} value={k}>{labelBulan(k)}</option>)}
          </select>
          <span className="small dim">{item.length} item booking</span>
        </div>
      </div>

      <div className="grid grid-kpi">
        <Kpi utama label="Nilai Booking Bruto" angka={rupiah(t.nilai)} sub={`${t.malam} malam terisi`} />
        <Kpi label="Setoran Owner" angka={rupiah(t.setoran)} />
        <Kpi label="Laba Kotor Travelink" angka={rupiah(labaTotal)} sub={t.nilai ? `margin ${(labaTotal / t.nilai * 100).toFixed(1)}%` : ''} />
        <Kpi label="Biaya" angka={rupiah(t.biaya + totalUmum)} sub={`termasuk umum ${rupiah(totalUmum)}`} />
        <Kpi label="Kas Bersih" angka={rupiah(kasBersih)} sub="laba kotor − semua biaya" />
      </div>

      <div className="card">
        <div className="card-head"><h2>Per Unit — {labelBulan(bulan)}</h2></div>
        {perUnit.length === 0 ? (
          <Kosong pesan="Belum ada data pada bulan ini." />
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead>
                <tr>
                  <th>Unit</th><th className="num">Malam</th><th className="num">Nilai Booking</th>
                  <th className="num">Setoran Owner</th><th className="num">Laba Kotor</th>
                  <th className="num">Biaya Unit</th><th className="num">Kas</th><th className="num">Margin</th>
                </tr>
              </thead>
              <tbody>
                {perUnit.map((r) => (
                  <tr key={r.unit} style={{ cursor: 'pointer' }} onClick={() => setDrill(r.unit)}>
                    <td className="mono bold">{r.unit}</td>
                    <td className="num">{r.malam}</td>
                    <td className="num">{ribuan(r.nilai)}</td>
                    <td className="num">{ribuan(r.setoran)}</td>
                    <td className="num">{ribuan(r.laba)}</td>
                    <td className="num">{ribuan(r.biaya)}</td>
                    <td className="num">{ribuan(r.kas)}</td>
                    <td className="num">{r.margin.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>TOTAL</td>
                  <td className="num">{t.malam}</td>
                  <td className="num">{ribuan(t.nilai)}</td>
                  <td className="num">{ribuan(t.setoran)}</td>
                  <td className="num">{ribuan(labaTotal)}</td>
                  <td className="num">{ribuan(t.biaya)}</td>
                  <td className="num">{ribuan(labaTotal - t.biaya)}</td>
                  <td className="num">{t.nilai ? (labaTotal / t.nilai * 100).toFixed(1) : '0.0'}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <div className="small dim mt8">Klik baris unit untuk melihat rincian bookingnya.</div>
      </div>

      {biayaUmum.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h2>Biaya Umum (bersama)</h2>
            <span className="mono bold">{rupiah(totalUmum)}</span>
          </div>
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th className="num">Nominal</th></tr></thead>
              <tbody>
                {biayaUmum.map((e) => (
                  <tr key={e.id}>
                    <td className="small nowrap">{e.tanggal}</td>
                    <td>{e.keterangan}</td>
                    <td className="small dim">{e.kategori}</td>
                    <td className="num">{ribuan(e.nominal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {drill && (
        <Modal
          judul={`Rincian unit ${drill} — ${labelBulan(bulan)}`}
          onTutup={() => setDrill(null)}
          lebar={780}
          anak={
            <div className="tabel-wrap">
              <table>
                <thead>
                  <tr><th>Tamu</th><th>Check-in</th><th>Check-out</th><th className="num">Malam</th><th className="num">Subtotal</th><th className="num">Setoran</th></tr>
                </thead>
                <tbody>
                  {item.filter((i) => (i.unitNomor || '(tanpa unit)') === drill).map((i, x) => (
                    <tr key={x}>
                      <td>{i.namaTamu}</td>
                      <td className="small nowrap">{i.checkIn}</td>
                      <td className="small nowrap">{i.checkOut}</td>
                      <td className="num">{i.malam}</td>
                      <td className="num">{ribuan(i.subtotal)}</td>
                      <td className="num">{ribuan(i.setoranOwner)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        />
      )}
    </div>
  );
}

/* =================== LAPORAN TAHUNAN =================== */
function LaporanTahunan({ bookings, expenses }) {
  const semuaItem = useMemo(() => ratakanItem(bookings), [bookings]);
  const tahunAda = useMemo(() => {
    const s = new Set(semuaItem.map((i) => i.bulan?.slice(0, 4)).filter(Boolean));
    for (const e of expenses || []) if (e.tanggal) s.add(String(e.tanggal).slice(0, 4));
    const arr = [...s].sort().reverse();
    return arr.length ? arr : [String(new Date().getFullYear())];
  }, [semuaItem, expenses]);

  const [tahun, setTahun] = useState(tahunAda[0]);

  const baris = useMemo(() => {
    const out = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${tahun}-${String(m).padStart(2, '0')}`;
      const it = semuaItem.filter((i) => i.bulan === key);
      const nilai = it.reduce((a, i) => a + n(i.subtotal), 0);
      const setoran = it.reduce((a, i) => a + n(i.setoranOwner), 0);
      const malam = it.reduce((a, i) => a + n(i.malam), 0);
      const biaya = (expenses || []).filter((e) => bulanKey(e.tanggal) === key).reduce((a, e) => a + n(e.nominal), 0);
      out.push({ bulan: BULAN[m - 1], nilai, setoran, malam, biaya, laba: nilai - setoran, kas: nilai - setoran - biaya });
    }
    return out;
  }, [semuaItem, expenses, tahun]);

  const t = baris.reduce(
    (a, r) => ({ nilai: a.nilai + r.nilai, setoran: a.setoran + r.setoran, malam: a.malam + r.malam, biaya: a.biaya + r.biaya, laba: a.laba + r.laba, kas: a.kas + r.kas }),
    { nilai: 0, setoran: 0, malam: 0, biaya: 0, laba: 0, kas: 0 }
  );

  return (
    <div className="stack">
      <div className="card">
        <div className="row wrap">
          <select value={tahun} onChange={(e) => setTahun(e.target.value)} style={{ width: 'auto' }}>
            {tahunAda.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-kpi">
        <Kpi utama label={`Nilai Booking ${tahun}`} angka={rupiah(t.nilai)} sub={`${t.malam} malam`} />
        <Kpi label="Setoran Owner" angka={rupiah(t.setoran)} />
        <Kpi label="Laba Kotor" angka={rupiah(t.laba)} sub={t.nilai ? `margin ${(t.laba / t.nilai * 100).toFixed(1)}%` : ''} />
        <Kpi label="Biaya" angka={rupiah(t.biaya)} />
        <Kpi label="Kas Bersih" angka={rupiah(t.kas)} />
      </div>

      <div className="card">
        <div className="card-head"><h2>Rekap 12 Bulan {tahun}</h2></div>
        <div className="tabel-wrap">
          <table>
            <thead>
              <tr>
                <th>Bulan</th><th className="num">Malam</th><th className="num">Nilai Booking</th>
                <th className="num">Setoran</th><th className="num">Laba Kotor</th><th className="num">Biaya</th>
                <th className="num">Kas Bersih</th><th className="num">Margin</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((r) => (
                <tr key={r.bulan}>
                  <td>{r.bulan}</td>
                  <td className="num">{r.malam}</td>
                  <td className="num">{ribuan(r.nilai)}</td>
                  <td className="num">{ribuan(r.setoran)}</td>
                  <td className="num">{ribuan(r.laba)}</td>
                  <td className="num">{ribuan(r.biaya)}</td>
                  <td className="num">{ribuan(r.kas)}</td>
                  <td className="num">{r.nilai ? (r.laba / r.nilai * 100).toFixed(1) : '0.0'}%</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>TOTAL</td>
                <td className="num">{t.malam}</td>
                <td className="num">{ribuan(t.nilai)}</td>
                <td className="num">{ribuan(t.setoran)}</td>
                <td className="num">{ribuan(t.laba)}</td>
                <td className="num">{ribuan(t.biaya)}</td>
                <td className="num">{ribuan(t.kas)}</td>
                <td className="num">{t.nilai ? (t.laba / t.nilai * 100).toFixed(1) : '0.0'}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =================== BIAYA =================== */
function Biaya({ user, units, expenses }) {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [konfirm, setKonfirm] = useState(null);
  const [bulan, setBulan] = useState('semua');

  const daftarBulan = useMemo(() => {
    const s = new Set((expenses || []).map((e) => bulanKey(e.tanggal)).filter(Boolean));
    return [...s].sort().reverse();
  }, [expenses]);

  const tampil = useMemo(
    () =>
      (expenses || [])
        .filter((e) => bulan === 'semua' || bulanKey(e.tanggal) === bulan)
        .sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal))),
    [expenses, bulan]
  );

  const total = tampil.reduce((a, e) => a + n(e.nominal), 0);

  async function simpan(data, id) {
    try {
      if (id) {
        await ubah(COL.expenses, id, data);
        await catatLog(user, 'Ubah biaya', `${data.keterangan} ${rupiah(data.nominal)}`);
      } else {
        await tambah(COL.expenses, { ...data, dibuatOleh: user.username });
        await catatLog(user, 'Tambah biaya', `${data.keterangan} ${rupiah(data.nominal)}`);
      }
      toast('Biaya tersimpan.');
      setForm(null);
    } catch {
      toast('Gagal menyimpan biaya.', 'err');
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="row wrap">
          <select value={bulan} onChange={(e) => setBulan(e.target.value)} style={{ width: 'auto' }}>
            <option value="semua">Semua bulan</option>
            {daftarBulan.map((k) => <option key={k} value={k}>{labelBulan(k)}</option>)}
          </select>
          <div className="grow" />
          <span className="mono bold">{rupiah(total)}</span>
          <button className="btn primary" onClick={() => setForm({})}>+ Biaya</button>
        </div>
      </div>

      <div className="card">
        {tampil.length === 0 ? (
          <Kosong pesan="Belum ada biaya tercatat." aksi={<button className="btn primary" onClick={() => setForm({})}>Tambah biaya</button>} />
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Unit</th><th className="num">Nominal</th><th></th></tr></thead>
              <tbody>
                {tampil.map((e) => (
                  <tr key={e.id}>
                    <td className="small nowrap">{e.tanggal}</td>
                    <td>{e.keterangan}</td>
                    <td className="small dim">{e.kategori}</td>
                    <td className="mono small">{e.unitNomor || 'Umum'}</td>
                    <td className="num">{ribuan(e.nominal)}</td>
                    <td className="right nowrap">
                      <button className="btn kecil" onClick={() => setForm(e)}>Ubah</button>{' '}
                      <button className="btn kecil danger" onClick={() => setKonfirm(e)}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && <FormBiaya awal={form.id ? form : null} units={units} onSimpan={simpan} onTutup={() => setForm(null)} />}

      {konfirm && (
        <Konfirmasi
          judul="Hapus biaya"
          pesan={`Biaya "${konfirm.keterangan}" akan dihapus. Lanjutkan?`}
          onYa={async () => {
            await hapus(COL.expenses, konfirm.id);
            await catatLog(user, 'Hapus biaya', konfirm.keterangan);
            toast('Biaya dihapus.');
            setKonfirm(null);
          }}
          onBatal={() => setKonfirm(null)}
        />
      )}
    </div>
  );
}

function FormBiaya({ awal, units, onSimpan, onTutup }) {
  const [keterangan, setKeterangan] = useState(awal?.keterangan || '');
  const [nominal, setNominal] = useState(n(awal?.nominal));
  const [tanggal, setTanggal] = useState(awal?.tanggal || hariIni());
  const [kategori, setKategori] = useState(awal?.kategori || KATEGORI_BIAYA[0]);
  const [unitNomor, setUnitNomor] = useState(awal?.unitNomor || UMUM);

  return (
    <Modal
      judul={awal ? 'Ubah Biaya' : 'Biaya Baru'}
      onTutup={onTutup}
      lebar={520}
      footer={
        <>
          <button className="btn" onClick={onTutup}>Batal</button>
          <button
            className="btn primary"
            onClick={() => keterangan.trim() && onSimpan({ keterangan: keterangan.trim(), nominal: n(nominal), tanggal, kategori, unitNomor }, awal?.id)}
          >
            Simpan
          </button>
        </>
      }
      anak={
        <div className="stack">
          <Field label="Keterangan">
            <input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Contoh: Kuota 1235 15GB" autoFocus />
          </Field>
          <div className="f-grid">
            <Field label="Nominal"><InputRupiah nilai={nominal} onUbah={setNominal} /></Field>
            <Field label="Tanggal"><input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></Field>
          </div>
          <div className="f-grid">
            <Field label="Kategori">
              <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
                {KATEGORI_BIAYA.map((k) => <option key={k}>{k}</option>)}
              </select>
            </Field>
            <Field label="Unit terkait">
              <select value={unitNomor} onChange={(e) => setUnitNomor(e.target.value)}>
                <option value={UMUM}>Umum (biaya bersama)</option>
                {(units || []).filter((u) => u.aktif !== false).map((u) => (
                  <option key={u.id} value={u.nomor}>{u.nomor}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      }
    />
  );
}
