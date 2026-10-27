import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserProfile, loginUser, logoutUser, bootstrapFirstAdmin, loginAsDemoRole } from '../services/authService';
import { UserProfile, UserRole } from '../types';
import { mockStore } from '../services/mockDataStore';

export const BROWSER_SESSION_KEY = 'skb_browser_session_active';

interface AuthContextType {
  user: User | UserProfile | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStaff: boolean;
  isSchoolStaff: boolean;
  isDeactivated: boolean;
  login: (email: string, pass: string) => Promise<User | UserProfile>;
  loginDemo: (role: UserRole) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  bootstrapAdmin: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (currentUser: User | UserProfile | null) => {
    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const p = await getUserProfile(currentUser.uid, (currentUser as any).email || undefined);
      setProfile(p);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Semak sama ada sesi browser ini masih aktif (disimpan dalam sessionStorage)
    const isSessionActive = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(BROWSER_SESSION_KEY) === '1';

    // Sekiranya browser baru sahaja dibuka dan tiada sesi aktif dalam sessionStorage:
    // Pengguna wajib log masuk semula. Bersihkan sebarang token Firebase atau profil setempat lama.
    if (!isSessionActive) {
      logoutUser().finally(() => {
        setUser(null);
        setProfile(null);
        setLoading(false);
      });
    }

    // Dengar status pengesahan Firebase
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const activeNow = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(BROWSER_SESSION_KEY) === '1';

      if (currentUser && !activeNow) {
        // Sekiranya terdapat token pudar dari pembukaan semula browser, paksa log keluar
        await logoutUser();
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (currentUser && activeNow) {
        setUser(currentUser);
        await fetchProfile(currentUser);
      } else {
        const demoUser = mockStore.getCurrentUser();
        if (demoUser && activeNow) {
          setUser(demoUser);
          setProfile(demoUser);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    // Dengar acara log keluar merentas tab jika ada tab lain yang menekan butang Log Keluar
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('skb_auth_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'LOGOUT') {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        };
      } catch {
        // Fallback jika BroadcastChannel tidak disokong
      }
    }

    return () => {
      unsubscribe();
      if (channel) channel.close();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(BROWSER_SESSION_KEY, '1');
      }
      const loggedUser = await loginUser(email, pass);
      setUser(loggedUser);
      await fetchProfile(loggedUser);
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = (role: UserRole) => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(BROWSER_SESSION_KEY, '1');
    }
    const demoUser = loginAsDemoRole(role);
    setUser(demoUser);
    setProfile(demoUser);
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(BROWSER_SESSION_KEY);
      }
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('skb_auth_channel');
          channel.postMessage({ type: 'LOGOUT' });
          channel.close();
        } catch {
          // Abaikan
        }
      }
      await logoutUser();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async (): Promise<boolean> => {
    if (!user) return false;
    const ok = await bootstrapFirstAdmin(user);
    if (ok) {
      await refreshProfile();
    }
    return ok;
  };

  const role = profile?.role || null;
  const isDeactivated = profile ? !profile.active : false;
  const isAdmin = useMemo(() => role === 'ADMIN' && !isDeactivated, [role, isDeactivated]);
  const isTeacher = useMemo(() => role === 'TEACHER' && !isDeactivated, [role, isDeactivated]);
  const isStaff = useMemo(() => role === 'STAFF' && !isDeactivated, [role, isDeactivated]);
  const isSchoolStaff = useMemo(() => (isAdmin || isTeacher || isStaff) && !isDeactivated, [isAdmin, isTeacher, isStaff, isDeactivated]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        isAdmin,
        isTeacher,
        isStaff,
        isSchoolStaff,
        isDeactivated,
        login,
        loginDemo,
        logout,
        refreshProfile,
        bootstrapAdmin: handleBootstrap
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth mesti digunakan di dalam AuthProvider');
  }
  return context;
};
