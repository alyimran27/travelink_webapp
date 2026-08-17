import React, { useEffect, useMemo, useState } from 'react';
import { COL, useCollection, useDoc } from './db';
import { SETTINGS_ID, PENGATURAN_DEFAULT, siapkanDataAwal } from './seed';
import { sesiTersimpan, logout } from './auth';
import { catatLog } from './db';
import { bolehBuka } from './access';
import { ToastProvider } from './ui';

import LoginPage from './LoginPage';
import Layout from './Layout';
import Dashboard from './Dashboard';
import BookingList from './BookingList';
import KwitansiPage from './KwitansiPage';
import KatalogPage from './KatalogPage';
import ReportPage from './ReportPage';
import MitraPage from './MitraPage';
import SettingsPage from './SettingsPage';
import ImportPage from './ImportPage';

export default function App() {
  const [siap, setSiap] = useState(false);
  const [gagal, setGagal] = useState(null);
  const [user, setUser] = useState(sesiTersimpan());
  const [menu, setMenu] = useState('beranda');
  const [kwitansiTerpilih, setKwitansiTerpilih] = useState(null);

  const { data: pengaturanDoc } = useDoc(COL.settings, SETTINGS_ID);
  const pengaturan = useMemo(() => ({ ...PENGATURAN_DEFAULT, ...(pengaturanDoc || {}) }), [pengaturanDoc]);

  const { data: bookings } = useCollection(COL.bookings);
  const { data: units } = useCollection(COL.units);
  const { data: expenses } = useCollection(COL.expenses);
  const { data: prospects } = useCollection(COL.prospects);

  // Siapkan data awal sekali saja
  useEffect(() => {
    siapkanDataAwal()
      .then(() => setSiap(true))
      .catch((e) => {
        console.error(e);
        setGagal(e);
        setSiap(true);
      });
  }, []);

  // Terapkan tema
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', pengaturan.tema || 'dark-blue');
  }, [pengaturan.tema]);

  // Judul tab
  useEffect(() => {
    document.title = pengaturan.namaPerusahaan || 'Travelink Makassar Management';
  }, [pengaturan.namaPerusahaan]);

  function keluar() {
    catatLog(user, 'Logout', '');
    logout();
    setUser(null);
    setMenu('beranda');
  }

  function bukaKwitansi(booking) {
    setKwitansiTerpilih(booking);
    setMenu('kwitansi');
  }

  if (!siap) {
    return <div className="login-wrap"><div className="dim">Menyiapkan aplikasi…</div></div>;
  }

  if (gagal) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h1>Tidak bisa terhubung</h1>
          <p className="small dim mt16">
            Aplikasi tidak bisa membaca database. Cek koneksi internet, lalu pastikan Firestore sudah aktif di project Firebase dan aturan aksesnya sudah dipasang.
          </p>
          <button className="btn primary blok mt16" onClick={() => window.location.reload()}>Coba lagi</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ToastProvider>
        <LoginPage pengaturan={pengaturan} onMasuk={setUser} />
      </ToastProvider>
    );
  }

  const menuAman = bolehBuka(user.role, menu) ? menu : 'beranda';

  return (
    <ToastProvider>
      <Layout user={user} pengaturan={pengaturan} menu={menuAman} setMenu={setMenu} onKeluar={keluar}>
        {menuAman === 'beranda' && (
          <Dashboard user={user} bookings={bookings} expenses={expenses} setMenu={setMenu} />
        )}

        {menuAman === 'booking' && (
          <BookingList
            user={user}
            units={units}
            pengaturan={pengaturan}
            bookings={bookings}
            onBuatKwitansi={bukaKwitansi}
          />
        )}

        {menuAman === 'kwitansi' && (
          <KwitansiPage
            user={user}
            pengaturan={pengaturan}
            bookings={bookings}
            terpilih={kwitansiTerpilih}
            setTerpilih={setKwitansiTerpilih}
          />
        )}

        {menuAman === 'katalog' && (
          <KatalogPage pengaturan={pengaturan} units={units} bookings={bookings} />
        )}

        {menuAman === 'report' && (
          <ReportPage
            user={user}
            units={units}
            bookings={bookings}
            expenses={expenses}
            prospects={prospects}
          />
        )}

        {menuAman === 'mitra' && <MitraPage user={user} units={units} prospects={prospects} />}

        {menuAman === 'settings' && (
          <SettingsPage
            user={user}
            pengaturan={pengaturan}
            units={units}
            bookings={bookings}
            expenses={expenses}
            prospects={prospects}
          />
        )}

        {menuAman === 'import' && <ImportPage user={user} />}
      </Layout>
    </ToastProvider>
  );
}
