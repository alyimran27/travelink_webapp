import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ribuan } from './format';

/* ---------- Modal ---------- */
export function Modal({ judul, anak, onTutup, footer, lebar }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onTutup();
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onTutup]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onTutup()}>
      <div className="modal" style={lebar ? { maxWidth: lebar } : undefined} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{judul}</h2>
          <button className="x" onClick={onTutup} aria-label="Tutup">×</button>
        </div>
        <div className="modal-body">{anak}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);

  const tampil = useCallback((pesan, jenis = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setList((l) => [...l, { id, pesan, jenis }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3800);
  }, []);

  return (
    <ToastCtx.Provider value={tampil}>
      {children}
      <div className="toast-wrap">
        {list.map((t) => (
          <div key={t.id} className={`toast ${t.jenis}`}>{t.pesan}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Konfirmasi ---------- */
export function Konfirmasi({ judul, pesan, labelYa = 'Hapus', onYa, onBatal }) {
  return (
    <Modal
      judul={judul}
      onTutup={onBatal}
      lebar={430}
      anak={<p style={{ margin: 0 }}>{pesan}</p>}
      footer={
        <>
          <button className="btn" onClick={onBatal}>Batal</button>
          <button className="btn danger" onClick={onYa}>{labelYa}</button>
        </>
      }
    />
  );
}

/* ---------- Field ---------- */
export function Field({ label, children }) {
  return (
    <label className="f">
      <span>{label}</span>
      {children}
    </label>
  );
}

/** Input angka dengan pemisah ribuan otomatis. */
export function InputRupiah({ nilai, onUbah, onSelesai, ...sisa }) {
  const [teks, setTeks] = useState(nilai ? ribuan(nilai) : '');
  const [fokus, setFokus] = useState(false);

  useEffect(() => {
    if (!fokus) setTeks(nilai ? ribuan(nilai) : '');
  }, [nilai, fokus]);

  return (
    <input
      {...sisa}
      inputMode="numeric"
      value={teks}
      onFocus={() => setFokus(true)}
      onBlur={(e) => {
        setFokus(false);
        setTeks(nilai ? ribuan(nilai) : '');
        if (onSelesai) onSelesai(Number(String(e.target.value).replace(/[^0-9]/g, '')) || 0);
      }}
      onChange={(e) => {
        const bersih = e.target.value.replace(/[^0-9]/g, '');
        setTeks(bersih ? ribuan(bersih) : '');
        onUbah(bersih ? Number(bersih) : 0);
      }}
      placeholder="0"
    />
  );
}

export function Badge({ jenis = 'netral', anak }) {
  return <span className={`badge ${jenis}`}>{anak}</span>;
}

export function badgeBayar(status) {
  if (status === 'Lunas') return <Badge jenis="ok" anak="Lunas" />;
  if (status === 'DP') return <Badge jenis="warn" anak="DP" />;
  return <Badge jenis="bad" anak="Belum" />;
}

export function badgeSetoran(status) {
  if (status === 'Issued') return <Badge jenis="ok" anak="Issued" />;
  if (status === 'Pending') return <Badge jenis="warn" anak="Pending" />;
  return <Badge jenis="netral" anak="Belum" />;
}

export function Kosong({ pesan, aksi }) {
  return (
    <div className="kosong">
      <div>{pesan}</div>
      {aksi && <div className="mt16">{aksi}</div>}
    </div>
  );
}

export function Kpi({ label, angka, sub, utama }) {
  return (
    <div className={`kpi${utama ? ' utama' : ''}`}>
      <div className="label">{label}</div>
      <div className="angka">{angka}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
