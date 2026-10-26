import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserProfile, loginUser, logoutUser, bootstrapFirstAdmin, loginAsDemoRole } from '../services/authService';
import { UserProfile, UserRole } from '../types';
import { mockStore } from '../services/mockDataStore';

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
    // Semak pengguna demo tersimpan terlebih dahulu
    const demoUser = mockStore.getCurrentUser();
    if (demoUser) {
      setUser(demoUser);
      setProfile(demoUser);
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchProfile(currentUser);
      } else if (!mockStore.getCurrentUser()) {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const loggedUser = await loginUser(email, pass);
      setUser(loggedUser);
      await fetchProfile(loggedUser);
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = (role: UserRole) => {
    const demoUser = loginAsDemoRole(role);
    setUser(demoUser);
    setProfile(demoUser);
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
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
