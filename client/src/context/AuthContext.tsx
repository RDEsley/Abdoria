import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getMe, login as apiLogin, logoutApi, register as apiRegister } from '@/lib/api';
import { clearToken, getToken, setSavedEmail, setToken } from '@/lib/auth-storage';
import { flagJustRegistered } from '@/lib/welcome-storage';
import { clearLegacyLocalData } from '@/lib/user-dados';
import { setSfxPack, setSoundSettings } from '@/lib/sounds';
import type { IUserDocument } from '@/types';
import { AuthContext } from '@/context/auth-context';

function applyPreferences(next: IUserDocument) {
  setSoundSettings(next.preferencias?.som_habilitado ?? true, next.preferencias?.sfx_volume ?? 0.7);
  setSfxPack(next.cosmeticos?.som_equipado ?? 'som_classico');
}

/** Estado de sessão JWT: login, registro, perfil e sincronização de preferências. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IUserDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const initialHydrationStarted = useRef(false);

  const applyUser = useCallback((next: IUserDocument) => {
    setUser(next);
    applyPreferences(next);
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
      applyPreferences(me);
    } catch {
      clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // React StrictMode executa effects de montagem duas vezes em desenvolvimento.
    if (initialHydrationStarted.current) return;
    initialHydrationStarted.current = true;
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

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    setToken(res.token);
    setSavedEmail(email);
    setUser(res.user);
    applyPreferences(res.user);
  }, []);

  const register = useCallback(async (email: string, password: string, nome: string) => {
    const res = await apiRegister(email, password, nome);
    flagJustRegistered();
    setToken(res.token);
    setSavedEmail(email);
    setUser(res.user);
    applyPreferences(res.user);
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
      register,
      logout,
      refreshUser,
      applyUser,
      isAuthenticated: !!user && !!getToken(),
    }),
    [user, loading, login, register, logout, refreshUser, applyUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
