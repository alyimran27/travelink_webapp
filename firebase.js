import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Config project Firebase Travelink Makassar Management.
// Aman ditaruh di sini: config web Firebase memang bersifat publik.
// Yang mengamankan data adalah Firestore Rules (lihat firestore.rules).
const firebaseConfig = {
  apiKey: 'AIzaSyBwbekSkWf9u3P9Qh3rYT47ls2hYPKo5Gc',
  authDomain: 'travelink-makassar-management.firebaseapp.com',
  projectId: 'travelink-makassar-management',
  storageBucket: 'travelink-makassar-management.firebasestorage.app',
  messagingSenderId: '425372545023',
  appId: '1:425372545023:web:e99c3910daad1583af01ca'
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Sign-in anonim supaya Firestore Rules bisa menolak akses dari luar aplikasi.
// Kalau provider Anonymous belum diaktifkan, app tetap jalan selama Firestore test mode.
export const authReady = signInAnonymously(auth).catch((err) => {
  console.warn('Sign-in anonim gagal (aktifkan Anonymous di Firebase Auth):', err?.code);
  return null;
});
