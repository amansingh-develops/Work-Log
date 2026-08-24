import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  User,
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
  doc,
  getDocFromServer,
  enableNetwork,
  disableNetwork,
} from "firebase/firestore";
import firebaseConfigData from "../../firebase-applet-config.json";

// Support both custom environment variables (e.g. for Vercel deployment) and bundled config
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigData.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigData.measurementId || "",
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with IndexedDB Multi-Tab Persistent Local Cache
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (e) {
  // Fallback if already initialized
  dbInstance = getFirestore(app);
}

export const db: Firestore = dbInstance;

// Initialize Auth
export const auth = getAuth(app);

// Enforce browser local persistence for Auth so sessions survive reloads
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Could not enable browser local persistence for Firebase Auth:", err);
});

// Configure Google Auth Provider with Google Tasks Scope
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/tasks");
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Operation Types for Error Handling
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore connection check: client is offline or network is warming up.");
    }
    return false;
  }
}

// Helper to store OAuth Access Token for Tasks API in session memory
let currentGoogleAccessToken: string | null = null;

export const setGoogleAccessToken = (token: string | null) => {
  currentGoogleAccessToken = token;
  if (token) {
    sessionStorage.setItem("google_tasks_access_token", token);
    localStorage.setItem("google_tasks_access_token", token);
  } else {
    sessionStorage.removeItem("google_tasks_access_token");
    localStorage.removeItem("google_tasks_access_token");
  }
};

export const getGoogleAccessToken = (): string | null => {
  if (currentGoogleAccessToken) return currentGoogleAccessToken;
  const token = sessionStorage.getItem("google_tasks_access_token") || localStorage.getItem("google_tasks_access_token");
  if (token) {
    currentGoogleAccessToken = token;
    return token;
  }
  return null;
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string | null }> => {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken || null;
  setGoogleAccessToken(token);
  return { user: result.user, accessToken: token };
};

export const signInGuest = async (): Promise<User> => {
  const result = await signInAnonymously(auth);
  return result.user;
};

export const signOut = async () => {
  setGoogleAccessToken(null);
  await firebaseSignOut(auth);
};

