"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createUserWithEmailAndPassword,
  GithubAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { firebaseAuth, hasFirebaseClientConfig } from '@/lib/firebase/client';

export type OAuthProviderId = 'google' | 'github' | 'microsoft' | 'apple';

type AuthState = {
  user: User | null;
  loading: boolean;
  token: string | null;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signInOAuth: (provider: OAuthProviderId) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(hasFirebaseClientConfig);

  useEffect(() => {
    if (!firebaseAuth || !hasFirebaseClientConfig) return;

    return onAuthStateChanged(firebaseAuth, async (nextUser) => {
      setUser(nextUser);
      setToken(nextUser ? await nextUser.getIdToken() : null);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      token,
      signInEmail: async (email: string, password: string) => {
        if (!firebaseAuth) throw new Error('Firebase Auth is not configured');
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      },
      signUpEmail: async (email: string, password: string) => {
        if (!firebaseAuth) throw new Error('Firebase Auth is not configured');
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
      },
      signInOAuth: async (providerId: OAuthProviderId) => {
        if (!firebaseAuth) throw new Error('Firebase Auth is not configured');
        const provider =
          providerId === 'google'
            ? new GoogleAuthProvider()
            : providerId === 'github'
              ? new GithubAuthProvider()
              : new OAuthProvider(providerId === 'microsoft' ? 'microsoft.com' : 'apple.com');
        await signInWithPopup(firebaseAuth, provider);
      },
      logout: async () => {
        if (!firebaseAuth) return;
        await signOut(firebaseAuth);
      },
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

