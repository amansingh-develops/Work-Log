import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db, signInWithGoogle, signInGuest, signOut as fbSignOut, getGoogleAccessToken, setGoogleAccessToken, testConnection } from "../lib/firebase";
import { UserProfile, DEFAULT_TAGS } from "../types";
import { sanitizeFirestorePayload } from "../lib/utils";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  tasksAuthorized: boolean;
  login: () => Promise<void>;
  loginGuest: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfileSettings: (updates: Partial<UserProfile>) => Promise<void>;
  addCustomTag: (tag: string) => Promise<void>;
  removeCustomTag: (tag: string) => Promise<void>;
  requestTasksAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasksAuthorized, setTasksAuthorized] = useState<boolean>(false);

  useEffect(() => {
    // Test Firestore connection on boot
    testConnection();

    // Check if token exists in session
    const token = getGoogleAccessToken();
    setTasksAuthorized(!!token);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const defaultProfile: UserProfile = {
          userId: currentUser.uid,
          displayName: currentUser.displayName || (currentUser.isAnonymous ? "Guest Developer" : "User"),
          email: currentUser.email || "",
          photoURL: currentUser.photoURL || undefined,
          defaultEnhanceOn: false,
          tagList: DEFAULT_TAGS,
        };

        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            setProfile(userSnap.data() as UserProfile);
          } else {
            // Initialize default profile doc in Firestore
            await setDoc(userDocRef, sanitizeFirestorePayload(defaultProfile), { merge: true });
            setProfile(defaultProfile);
          }
        } catch (error) {
          console.warn("Could not retrieve profile doc from Firestore, using fallback:", error);
          setProfile((prev) => prev || defaultProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
        setGoogleAccessToken(null);
        setTasksAuthorized(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const { user: authedUser, accessToken } = await signInWithGoogle();
      setUser(authedUser);
      setTasksAuthorized(!!accessToken);
    } catch (err: any) {
      console.error("Login failed:", err);
      throw err;
    }
  };

  const loginGuest = async () => {
    try {
      const guest = await signInGuest();
      setUser(guest);
    } catch (err) {
      console.error("Guest login failed:", err);
      throw err;
    }
  };

  const requestTasksAccess = async () => {
    try {
      const { accessToken } = await signInWithGoogle();
      setTasksAuthorized(!!accessToken);
    } catch (err) {
      console.error("Failed to request Tasks scope:", err);
      throw err;
    }
  };

  const logout = async () => {
    await fbSignOut();
    setUser(null);
    setProfile(null);
    setTasksAuthorized(false);
  };

  const updateProfileSettings = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const updated = { ...profile, ...updates };
    setProfile(updated);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, sanitizeFirestorePayload(updates));
    } catch (error) {
      console.error("Error updating profile settings:", error);
    }
  };

  const addCustomTag = async (newTag: string) => {
    if (!profile) return;
    const clean = newTag.trim().toLowerCase();
    if (!clean || profile.tagList.includes(clean)) return;

    const newTagList = [...profile.tagList, clean];
    await updateProfileSettings({ tagList: newTagList });
  };

  const removeCustomTag = async (tagToRemove: string) => {
    if (!profile) return;
    const newTagList = profile.tagList.filter((t) => t !== tagToRemove);
    await updateProfileSettings({ tagList: newTagList });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        tasksAuthorized,
        login,
        loginGuest,
        logout,
        updateProfileSettings,
        addCustomTag,
        removeCustomTag,
        requestTasksAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
