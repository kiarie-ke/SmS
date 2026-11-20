'use client';

import type { Role } from '@school-system/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { setAccessToken as storeAccessToken } from '@/lib/api/auth-token';

export interface SessionUser {
  id: string;
  email: string;
  phone: string;
  role: Role;
  isActive?: boolean;
  lastLoginAt?: string | null;
}

interface AuthContextValue {
  user: SessionUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate the in-memory access token from the httpOnly refresh cookie.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const response = await fetch('/api/session/refresh', {
          method: 'POST',
          credentials: 'same-origin',
        });
        if (!response.ok) return;
        const body = (await response.json()) as {
          accessToken: string;
          user: SessionUser;
        };
        if (!cancelled) {
          storeAccessToken(body.accessToken);
          setAccessToken(body.accessToken);
          setUser(body.user);
        }
      } catch {
        // Stay signed out; the middleware will route to /login.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/session/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await readJson(response);
    if (!response.ok) {
      throw new Error(
        typeof body.message === 'string' ? body.message : 'Unable to sign in',
      );
    }
    storeAccessToken(body.accessToken as string);
    setAccessToken(body.accessToken as string);
    setUser(body.user as SessionUser);
    return body.user as SessionUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/session', { method: 'DELETE' });
    } finally {
      storeAccessToken(null);
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, accessToken, isLoading, login, logout }),
    [user, accessToken, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
