import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserProfile, loginUser, logoutUser, bootstrapFirstAdmin, loginAsDemoRole } from '../services/authService';
import { UserProfile, UserRole } from '../types';
import { mockStore } from '../services/mockDataStore';
import { 
  sessionManager, 
  DEFAULT_TIMEOUT_MESSAGE, 
  WARNING_WINDOW_MS 
} from '../services/sessionManager';

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
  sessionExpiredMessage: string | null;
  isWarningModalOpen: boolean;
  sessionRemainingMs: number;
  login: (email: string, pass: string) => Promise<User | UserProfile>;
  loginDemo: (role: UserRole) => void;
  logout: () => Promise<void>;
  extendSession: () => void;
  clearExpiredMessage: () => void;
  refreshProfile: () => Promise<void>;
  bootstrapAdmin: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState<boolean>(false);
  const [sessionRemainingMs, setSessionRemainingMs] = useState<number>(0);

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

  const handleSessionExpired = useCallback(async () => {
    setIsWarningModalOpen(false);
    sessionManager.terminateSession(DEFAULT_TIMEOUT_MESSAGE);
    await logoutUser();
    setUser(null);
    setProfile(null);
    setSessionExpiredMessage(DEFAULT_TIMEOUT_MESSAGE);
  }, []);

  const extendSession = useCallback(() => {
    const success = sessionManager.extendSession();
    if (success) {
      setIsWarningModalOpen(false);
      setSessionRemainingMs(sessionManager.getRemainingTimeMs());
    } else {
      handleSessionExpired();
    }
  }, [handleSessionExpired]);

  const clearExpiredMessage = useCallback(() => {
    setSessionExpiredMessage(null);
    sessionManager.consumeTerminatedMessage();
  }, []);

  // 1. Inisialisasi Aplikasi & Validasi Sesi Semasa Mula Dibuka
  useEffect(() => {
    const storedReason = sessionManager.consumeTerminatedMessage();
    if (storedReason) {
      setSessionExpiredMessage(storedReason);
    }

    const lastActive = sessionManager.getLastActiveTimestamp();
    const demoUser = mockStore.getCurrentUser();

    // Sekiranya ada sesi tersimpan tetapi telah tamat tempoh (> 30 minit):
    if (lastActive > 0 && !sessionManager.isSessionValid()) {
      logoutUser().finally(() => {
        setUser(null);
        setProfile(null);
        setLoading(false);
        setSessionExpiredMessage(DEFAULT_TIMEOUT_MESSAGE);
      });
      return;
    }

    // Jika sesi masih sah (< 30 minit) dan pengguna demo wujud:
    if (sessionManager.isSessionValid() && demoUser) {
      setUser(demoUser);
      setProfile(demoUser);
      setLoading(false);
      sessionManager.recordUserActivity();
    }

    // Dengar perubahan status Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Pastikan sesi Firebase tidak dihidupkan jika sesi ketidakaktifan tempatan telah luput
        if (!sessionManager.isSessionValid()) {
          await logoutUser();
          setUser(null);
          setProfile(null);
          setLoading(false);
          setSessionExpiredMessage(DEFAULT_TIMEOUT_MESSAGE);
          return;
        }

        setUser(currentUser);
        await fetchProfile(currentUser);
        sessionManager.recordUserActivity();
      } else if (!mockStore.getCurrentUser() || !sessionManager.isSessionValid()) {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Pemantau Aktiviti Fizikal & Pemasa Semakan Inactivity (Setiap 1 Saat)
  useEffect(() => {
    if (!user) {
      setIsWarningModalOpen(false);
      return;
    }

    // Pasang pendengar peristiwa fizikal pengguna (mouse, touch, keydown, scroll)
    const cleanupActivity = sessionManager.attachUserActivityListeners();

    // Dengar acara penyegerakan merentas tab
    const unsubscribeEvents = sessionManager.onSessionEvent((event) => {
      if (event.type === 'TERMINATE') {
        setUser(null);
        setProfile(null);
        setIsWarningModalOpen(false);
        setSessionExpiredMessage(event.reason || DEFAULT_TIMEOUT_MESSAGE);
      } else if (event.type === 'EXTEND' || event.type === 'ACTIVITY') {
        const rem = sessionManager.getRemainingTimeMs();
        setSessionRemainingMs(rem);
        if (!sessionManager.isWarningPeriod()) {
          setIsWarningModalOpen(false);
        }
      }
    });

    // Semakan berjadual setiap 1 saat
    const intervalTimer = setInterval(() => {
      if (!sessionManager.isSessionValid()) {
        handleSessionExpired();
        return;
      }

      const rem = sessionManager.getRemainingTimeMs();
      setSessionRemainingMs(rem);

      if (sessionManager.isWarningPeriod()) {
        setIsWarningModalOpen(true);
      } else {
        setIsWarningModalOpen(false);
      }
    }, 1000);

    return () => {
      cleanupActivity();
      unsubscribeEvents();
      clearInterval(intervalTimer);
    };
  }, [user, handleSessionExpired]);

  const refreshProfile = async () => {
    if (user && sessionManager.isSessionValid()) {
      await fetchProfile(user);
    }
  };

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setSessionExpiredMessage(null);
    try {
      const loggedUser = await loginUser(email, pass);
      sessionManager.initSession(loggedUser.uid);
      setUser(loggedUser);
      await fetchProfile(loggedUser);
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = (role: UserRole) => {
    setSessionExpiredMessage(null);
    const demoUser = loginAsDemoRole(role);
    sessionManager.initSession(demoUser.uid);
    setUser(demoUser);
    setProfile(demoUser);
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    setIsWarningModalOpen(false);
    sessionManager.terminateSession('Pengguna telah log keluar secara manual.');
    try {
      await logoutUser();
      setUser(null);
      setProfile(null);
      setSessionExpiredMessage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async (): Promise<boolean> => {
    if (!user || !sessionManager.isSessionValid()) return false;
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
        sessionExpiredMessage,
        isWarningModalOpen,
        sessionRemainingMs,
        login,
        loginDemo,
        logout,
        extendSession,
        clearExpiredMessage,
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
