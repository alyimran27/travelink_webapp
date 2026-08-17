import { useEffect, useState } from 'react';
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  setDoc, getDocs, getDoc, query, where, limit, orderBy
} from 'firebase/firestore';
import { db } from './firebase';

export const COL = {
  users: 'users',
  devices: 'devices',
  units: 'units',
  bookings: 'bookings',
  expenses: 'expenses',
  prospects: 'prospects',
  activity: 'activity',
  settings: 'settings'
};

/** Dengarkan satu koleksi secara realtime. */
export function useCollection(nama) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, nama),
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Gagal membaca ' + nama, err);
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [nama]);

  return { data, loading, error };
}

/** Dengarkan satu dokumen secara realtime. */
export function useDoc(nama, id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, nama, id), (snap) => {
      setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    }, (err) => {
      console.error('Gagal membaca ' + nama + '/' + id, err);
      setLoading(false);
    });
    return unsub;
  }, [nama, id]);

  return { data, loading };
}

export async function tambah(nama, data) {
  const ref = await addDoc(collection(db, nama), { ...data, dibuatPada: Date.now() });
  return ref.id;
}

export async function ubah(nama, id, data) {
  await updateDoc(doc(db, nama, id), { ...data, diubahPada: Date.now() });
}

export async function simpanDoc(nama, id, data) {
  await setDoc(doc(db, nama, id), data, { merge: true });
}

export async function hapus(nama, id) {
  await deleteDoc(doc(db, nama, id));
}

export async function ambilSemua(nama) {
  const snap = await getDocs(collection(db, nama));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function ambilDoc(nama, id) {
  const snap = await getDoc(doc(db, nama, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function cariSatu(nama, field, nilai) {
  const q = query(collection(db, nama), where(field, '==', nilai), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/** Catat aktivitas siapa mengubah apa. */
export async function catatLog(user, aksi, detail) {
  try {
    await addDoc(collection(db, COL.activity), {
      user: user?.username || 'sistem',
      role: user?.role || '-',
      aksi,
      detail: detail || '',
      waktu: Date.now()
    });
  } catch (e) {
    console.warn('Gagal mencatat log', e);
  }
}

export async function ambilLog(maks = 200) {
  try {
    const q = query(collection(db, COL.activity), orderBy('waktu', 'desc'), limit(maks));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const semua = await ambilSemua(COL.activity);
    return semua.sort((a, b) => b.waktu - a.waktu).slice(0, maks);
  }
}
