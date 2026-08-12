import React from 'react';
import { menuUntuk } from './access';

export default function Layout({ user, pengaturan, menu, setMenu, onKeluar, children }) {
  const daftar = menuUntuk(user.role);

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          {pengaturan?.logoUrl ? (
            <img src={pengaturan.logoUrl} alt="" />
          ) : (
            <>
              <div className="brand-mark">TM</div>
              <div className="brand-text">
                Travelink<br />Makassar
              </div>
            </>
          )}
        </div>

        {daftar.map((m) => (
          <button
            key={m.id}
            className={`navbtn${menu === m.id ? ' aktif' : ''}`}
            onClick={() => setMenu(m.id)}
          >
            <span className="ico" aria-hidden="true">{m.ico}</span>
            {m.label}
          </button>
        ))}
      </nav>

      <div className="main">
        <header className="topbar">
          <h1>{daftar.find((m) => m.id === menu)?.label || 'Beranda'}</h1>
          <div className="row">
            <div className="chip-user hide-mobile">
              <span className="bold small">{user.nama}</span>
              <span className="tiny dim">{user.role === 'owner' ? 'Owner' : 'Admin'}</span>
            </div>
            <button className="btn kecil" onClick={onKeluar}>Keluar</button>
          </div>
        </header>

        <main className="konten">{children}</main>
      </div>
    </div>
  );
}
