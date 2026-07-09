import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase.js';
import { api, apiClient, type User } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name?: string, partnerId?: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Attach Firebase ID token to every outgoing API request
    const interceptor = apiClient.interceptors.request.use(async (config) => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    });

    // Observe Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Sync user profile from backend (upserts on first login)
        try {
          const token = await fbUser.getIdToken();
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const appUser = await api.syncUser();
          setUser(appUser);
        } catch (e) {
          console.error('Failed to sync user profile:', e);
          setUser(null);
        }
      } else {
        setUser(null);
        delete apiClient.defaults.headers.common['Authorization'];
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      apiClient.interceptors.request.eject(interceptor);
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const appUser = await api.syncUser();
      setUser(appUser);
      return appUser;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string, partnerId?: string): Promise<User> => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const appUser = await api.syncUser(name, partnerId);
      setUser(appUser);
      return appUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
    delete apiClient.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
