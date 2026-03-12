import { useEffect, useState } from 'react';

import { api, clearToken, getToken, setToken, type AppUser } from '../api';

export function useAppSession(defaultExtId = 'TALL') {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [extId, setExtId] = useState(defaultExtId);
  const [loginError, setLoginError] = useState('');
  const [devToolsEnabled, setDevToolsEnabled] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.getMe()
        .then(setUser)
        .catch(() => clearToken())
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const handlePermissionsUpdated = () => {
      const token = getToken();
      if (!token) {
        return;
      }
      api.getMe()
        .then(setUser)
        .catch(() => clearToken());
    };
    window.addEventListener('tpl:permissions-updated', handlePermissionsUpdated);
    return () => {
      window.removeEventListener('tpl:permissions-updated', handlePermissionsUpdated);
    };
  }, []);

  useEffect(() => {
    api.getHealth()
      .then((health) => {
        const env = (health.env ?? '').toUpperCase();
        setDevToolsEnabled(Boolean(health.dev_tools_enabled) || env === 'DEV' || env === 'TEST');
      })
      .catch(() => setDevToolsEnabled(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const { token, user: loggedIn } = await api.login(extId.trim());
      setToken(token);
      setUser(loggedIn);
    } catch {
      setLoginError('Unknown user. Please check your ID.');
    }
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
  };

  return {
    user,
    setUser,
    authLoading,
    extId,
    setExtId,
    loginError,
    setLoginError,
    devToolsEnabled,
    handleLogin,
    handleLogout,
  };
}
