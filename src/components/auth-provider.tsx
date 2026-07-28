'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api } from '@/lib/api-client';
import { clearToken, getStoredUser, getToken, setStoredUser } from '@/lib/auth';
import type { AuthUser, MerchantProfile } from '@/lib/types';

interface AuthState {
  user: AuthUser | null;
  merchant: MerchantProfile | null;
  loading: boolean;
  logout: () => void;
  /** Merge a change into the session user and persist it, so the header updates
   *  in place instead of the UI asking the user to reload the page. */
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  merchant: null,
  loading: true,
  logout: () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setMerchant(null);
    router.push('/login');
  }, [router]);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      setStoredUser(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      setLoading(false);
      return;
    }
    const stored = getStoredUser();
    setUser(stored);

    // Admins have no merchant profile to fetch; merchant users load theirs.
    if (stored && stored.role !== 'MERCHANT') {
      setLoading(false);
      return;
    }
    api
      .getProfile()
      .then(setMerchant)
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [router, logout]);

  return (
    <AuthContext.Provider value={{ user, merchant, loading, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
