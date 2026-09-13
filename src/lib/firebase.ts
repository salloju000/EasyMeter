import { initializeApp } from "firebase/app";
import {
  deleteDoc,
  doc,
  getFirestore,
  setDoc,
  collection,
  getDocs,
  getDoc,
} from "firebase/firestore";
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
let currentUserId: string | null = null;

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

export function setCurrentUser(userId: string | null) {
  currentUserId = userId;
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

function getCollectionPath(collection: string): string {
  if (!currentUserId) throw new Error("No authenticated user");
  return `users/${currentUserId}/${collection}`;
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
  if (!currentUserId) return; // Skip if no user
  const firestore = assertFirebase();
  await setDoc(doc(firestore, getCollectionPath("bills"), bill.id), sanitizeForFirestore(bill), { merge: true });
}

export async function deleteBillFromFirebase(id: string) {
  if (!currentUserId) return; // Skip if no user
  const firestore = assertFirebase();
  await deleteDoc(doc(firestore, getCollectionPath("bills"), id));
}

export async function saveTenantToFirebase(tenant: Tenant) {
  if (!currentUserId) return; // Skip if no user
  const firestore = assertFirebase();
  await setDoc(doc(firestore, getCollectionPath("tenants"), tenant.id), sanitizeForFirestore(tenant), { merge: true });
}

export async function deleteTenantFromFirebase(id: string) {
  if (!currentUserId) return; // Skip if no user
  const firestore = assertFirebase();
  await deleteDoc(doc(firestore, getCollectionPath("tenants"), id));
}

export async function saveTariffToFirebase(tariff: TariffConfig) {
  if (!currentUserId) return; // Skip if no user
  const firestore = assertFirebase();
  await setDoc(doc(firestore, getCollectionPath("config"), "tariff"), { tariff: sanitizeForFirestore(tariff) }, { merge: true });
}

export async function loadBillsFromFirebase(): Promise<Bill[]> {
  if (!currentUserId) return [];
  try {
    const firestore = assertFirebase();
    const billsCollection = collection(firestore, getCollectionPath("bills"));
    const snapshot = await getDocs(billsCollection);
    const bills = snapshot.docs.map((doc) => doc.data() as Bill);
    return bills.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch (error) {
    console.warn("Failed to load bills from Firebase", error);
    return [];
  }
}

export async function loadTenantsFromFirebase(): Promise<Tenant[]> {
  if (!currentUserId) return [];
  try {
    const firestore = assertFirebase();
    const tenantsCollection = collection(firestore, getCollectionPath("tenants"));
    const snapshot = await getDocs(tenantsCollection);
    const tenants = snapshot.docs.map((doc) => doc.data() as Tenant);
    return tenants.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn("Failed to load tenants from Firebase", error);
    return [];
  }
}

export async function loadTariffFromFirebase(): Promise<TariffConfig | null> {
  if (!currentUserId) return null;
  try {
    const firestore = assertFirebase();
    const tariffDoc = await getDoc(doc(firestore, getCollectionPath("config"), "tariff"));
    if (tariffDoc.exists()) {
      const data = tariffDoc.data() as { tariff?: TariffConfig };
      return data.tariff || null;
    }
    return null;
  } catch (error) {
    console.warn("Failed to load tariff from Firebase", error);
    return null;
  }
}

