import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, hasStoredAuthToken } from '../api/client';
import { forgetLastRole, preloadAdminHome, rememberLastRole } from '../utils/preloadAdminHome';

const AuthContext = createContext(null);
const AUTH_BOOT_TIMEOUT_MS = 15000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => hasStoredAuthToken());
  const [error, setError] = useState('');
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshUser = useCallback(async () => {
    const result = await api.me();
    rememberLastRole(result.data?.role);
    preloadAdminHome();
    setUser(result.data);
    return result.data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    api.syncTokenFromStorage();

    function handleUnauthorized() {
      if (userRef.current) {
        setError('登入已過期，請重新登入');
      }

      setUser(null);
      window.dispatchEvent(new Event('ac:logout'));
    }

    window.addEventListener('ac:unauthorized', handleUnauthorized);

    function finishBoot() {
      if (!cancelled) {
        setLoading(false);
      }
    }

    if (!api.getToken()) {
      finishBoot();
      return () => {
        cancelled = true;
        window.removeEventListener('ac:unauthorized', handleUnauthorized);
      };
    }

    const timeoutId = window.setTimeout(() => {
      api.setToken('');
      setUser(null);
      setError('連線逾時，請重新登入');
      window.dispatchEvent(new Event('ac:logout'));
      finishBoot();
    }, AUTH_BOOT_TIMEOUT_MS);

    api.me()
      .then((result) => {
        if (!cancelled) {
          rememberLastRole(result.data?.role);
          preloadAdminHome();
          setUser(result.data);
          setError('');
        }
      })
      .catch(() => {
        if (!cancelled) {
          api.setToken('');
          forgetLastRole();
          setUser(null);
          window.dispatchEvent(new Event('ac:logout'));
          setError('');
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        finishBoot();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener('ac:unauthorized', handleUnauthorized);
    };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    error,
    setError,
    refreshUser,
    async login(account, password, remember = false) {
      setError('');
      const result = await api.login(account, password, remember);
      rememberLastRole(result.data.user?.role);
      preloadAdminHome();
      window.dispatchEvent(new Event('ac:login'));
      setUser(result.data.user);
      return result;
    },
    async loginWithToken(token, remember = false) {
      setError('');
      api.setToken(token, { remember });
      const result = await api.me();
      rememberLastRole(result.data?.role);
      preloadAdminHome();
      window.dispatchEvent(new Event('ac:login'));
      setUser(result.data);
      return result.data;
    },
    async logout() {
      try {
        await api.logout();
      } finally {
        forgetLastRole();
        window.dispatchEvent(new Event('ac:logout'));
        setUser(null);
      }
    },
  }), [user, loading, error, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export { ApiError };
