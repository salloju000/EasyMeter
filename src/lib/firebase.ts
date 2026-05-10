import { initializeApp } from "firebase/app";
import { deleteDoc, doc, getFirestore, setDoc } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import type { Bill, TariffConfig, Tenant } from "./types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigComplete = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

if (isConfigComplete) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.warn("Firebase initialization failed", error);
    db = null;
    auth = null;
  }
}

export function isFirebaseEnabled() {
  return db !== null && auth !== null;
}

function assertFirebase() {
  if (!db) {
    throw new Error("Firebase is not configured. Set VITE_FIREBASE_* env vars.");
  }
  return db;
}

function assertFirebaseAuth() {
  if (!auth) {
    throw new Error("Firebase Auth is not configured. Set VITE_FIREBASE_* env vars.");
  }
  return auth;
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!auth) {
    return () => undefined;
  }
  return onAuthStateChanged(auth, callback);
}

export function signInWithGoogle() {
  const authInstance = assertFirebaseAuth();
  const provider = new GoogleAuthProvider();
  return signInWithPopup(authInstance, provider);
}

export function signOutGoogle() {
  return firebaseSignOut(assertFirebaseAuth());
}

// Helper to remove undefined values from objects before saving to Firestore
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const sanitized: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      sanitized[key as keyof T] = value;
    }
  }
  return sanitized;
}

export async function saveBillToFirebase(bill: Bill) {
  const firestore = assertFirebase();
  await setDoc(doc(firestore, "bills", bill.id), sanitizeForFirestore(bill), { merge: true });
}

export async function deleteBillFromFirebase(id: string) {
  const firestore = assertFirebase();
  await deleteDoc(doc(firestore, "bills", id));
}

export async function saveTenantToFirebase(tenant: Tenant) {
  const firestore = assertFirebase();
  await setDoc(doc(firestore, "tenants", tenant.id), sanitizeForFirestore(tenant), { merge: true });
}

export async function deleteTenantFromFirebase(id: string) {
  const firestore = assertFirebase();
  await deleteDoc(doc(firestore, "tenants", id));
}

export async function saveTariffToFirebase(tariff: TariffConfig) {
  const firestore = assertFirebase();
  await setDoc(doc(firestore, "config", "tariff"), { tariff: sanitizeForFirestore(tariff) }, { merge: true });
}
