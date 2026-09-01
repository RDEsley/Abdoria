import { createContext } from 'react';
import type { IUserDocument } from '@/types';

export interface AuthContextValue {
  user: IUserDocument | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  register: (email: string, password: string, nome: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  applyUser: (user: IUserDocument) => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
