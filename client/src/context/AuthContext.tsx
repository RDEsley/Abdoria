import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getMe, login as apiLogin, loginAsGuest as apiGuest, logoutApi, register as apiRegister } from '@/lib/api';
import { clearToken, getToken, setSavedEmail, setToken } from '@/lib/auth-storage';
import { clearLegacyLocalData } from '@/lib/user-dados';
import { setSfxPack, setSoundSettings } from '@/lib/sounds';
import type { IUserDocument } from '@/types';

interface AuthContextValue {
  user: IUserDocument | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  register: (email: string, password: string, nome: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  applyUser: (user: IUserDocument) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Estado de sessão JWT: login, registro, perfil e sincronização de preferências. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IUserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((next: IUserDocument) => {
    setUser(next);
    setSoundSettings(next.preferencias?.som_habilitado ?? true, next.preferencias?.sfx_volume ?? 0.7);
    setSfxPack(next.cosmeticos?.som_equipado ?? 'som_classico');
  }, []);

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
      setSfxPack(me.cosmeticos?.som_equipado ?? 'som_classico');
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
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<IUserDocument>).detail;
      if (detail) applyUser(detail);
    };
    window.addEventListener('abdoria:user-updated', handler);
    return () => window.removeEventListener('abdoria:user-updated', handler);
  }, [applyUser]);

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
    const userId = user?.id;
    try {
      await logoutApi();
    } finally {
      if (userId) clearLegacyLocalData(userId);
      clearToken();
      setUser(null);
    }
  }, [user?.id]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginAsGuest,
      register,
      logout,
      refreshUser,
      applyUser,
      isAuthenticated: !!user && !!getToken(),
    }),
    [user, loading, login, loginAsGuest, register, logout, refreshUser, applyUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
