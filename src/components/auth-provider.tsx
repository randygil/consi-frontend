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
import { clearToken, getStoredUser, getToken } from '@/lib/auth';
import type { AuthUser, MerchantProfile } from '@/lib/types';

interface AuthState {
  user: AuthUser | null;
  merchant: MerchantProfile | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  merchant: null,
  loading: true,
  logout: () => {},
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
    <AuthContext.Provider value={{ user, merchant, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
