import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getMe, login as apiLogin, loginAsGuest as apiGuest, logoutApi, register as apiRegister } from '@/lib/api';
import { clearToken, getToken, setSavedEmail, setToken } from '@/lib/auth-storage';
import { setSoundSettings } from '@/lib/sounds';
import type { IUserDocument } from '@/types';

interface AuthContextValue {
  user: IUserDocument | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  register: (email: string, password: string, nome: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Estado de sessão JWT: login, registro, perfil e sincronização de preferências. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IUserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
      setSoundSettings(me.preferencias?.som_habilitado ?? true, me.preferencias?.sfx_volume ?? 0.7);
    } catch {
      clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshUser();
      setLoading(false);
    })();
  }, [refreshUser]);

  useEffect(() => {
    const handler = () => {
      clearToken();
      setUser(null);
    };
    window.addEventListener('abdoria:unauthorized', handler);
    return () => window.removeEventListener('abdoria:unauthorized', handler);
  }, []);

  const login = useCallback(async (email: string, password: string, remember = true) => {
    const res = await apiLogin(email, password);
    setToken(res.token, remember);
    setSavedEmail(remember ? email : null);
    setUser(res.user);
    setSoundSettings(res.user.preferencias?.som_habilitado ?? true, res.user.preferencias?.sfx_volume ?? 0.7);
  }, []);

  const loginAsGuest = useCallback(async () => {
    const res = await apiGuest();
    setToken(res.token, false);
    setSavedEmail(null);
    setUser(res.user);
    setSoundSettings(res.user.preferencias?.som_habilitado ?? true, res.user.preferencias?.sfx_volume ?? 0.7);
  }, []);

  const register = useCallback(async (email: string, password: string, nome: string, remember = true) => {
    const res = await apiRegister(email, password, nome);
    setToken(res.token, remember);
    setSavedEmail(remember ? email : null);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      clearToken();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginAsGuest,
      register,
      logout,
      refreshUser,
      isAuthenticated: !!user && !!getToken(),
    }),
    [user, loading, login, loginAsGuest, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
