import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  signOut,
} from 'firebase/auth';

// Web app config from Firebase Console (safe to ship in client code -- it
// identifies the project, it is not a secret; access is enforced by Auth + backend).
const firebaseConfig = {
  apiKey: 'AIzaSyDnXsXcTFLQcwaBkcM6y2LuPqs84hlCJ5k',
  authDomain: 'fahflow-b0867.firebaseapp.com',
  databaseURL: 'https://fahflow-b0867-default-rtdb.firebaseio.com',
  projectId: 'fahflow-b0867',
  storageBucket: 'fahflow-b0867.firebasestorage.app',
  messagingSenderId: '561847681527',
  appId: '1:561847681527:web:65a052c7d85c5157af6ef2',
  measurementId: 'G-S5WK4KG3N7',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export async function signUpWithEmail(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  return cred.user;
}

export async function signInWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutUser() {
  await signOut(auth);
}
