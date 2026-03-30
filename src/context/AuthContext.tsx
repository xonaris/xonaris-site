import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, maintenanceApi } from '../api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMaintenance: boolean;
  maintenanceReason: string | null;
  isBanned: boolean;
  banReason: string | null;
  premiumPrice: string | null;
  announcementActive: boolean;
  announcementText: string | null;
  announcementColor: string | null;
  bckgrndBanned: string | null;
  bckgrndMaintenance: string | null;
  login: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<{ isBanned: boolean }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceReason, setMaintenanceReason] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [premiumPrice, setPremiumPrice] = useState<string | null>(null);
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [announcementText, setAnnouncementText] = useState<string | null>(null);
  const [announcementColor, setAnnouncementColor] = useState<string | null>(null);
  const [bckgrndBanned, setBckgrndBanned] = useState<string | null>(null);
  const [bckgrndMaintenance, setBckgrndMaintenance] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<{ isBanned: boolean }> => {
    try {
      // Public config: maintenance status + premium price
      try {
        const [m, config] = await Promise.all([
          maintenanceApi.getStatus(),
          authApi.getPublicConfig(),
        ]);
        setIsMaintenance(m.active);
        setMaintenanceReason(m.active ? (m.reason ?? null) : null);
        setPremiumPrice(config.premium_price);
        setAnnouncementActive(config.announcement_active ?? false);
        setAnnouncementText(config.announcement_text ?? null);
        setAnnouncementColor(config.announcement_color ?? null);
        setBckgrndBanned(config.bckgrnd_banned ?? null);
        setBckgrndMaintenance(config.bckgrnd_maintenance ?? null);
      } catch {
        // If endpoint fails, assume no maintenance
      }

      // User profile
      const u = await authApi.getMe();
      setUser(u);
      if (u.is_banned) {
        // Backend returned banned flag in user object
        setIsBanned(true);
        setBanReason(u.ban_reason ?? null);
        return { isBanned: true };
      } else {
        // User is not banned — clear ban state
        setIsBanned(false);
        setBanReason(null);
        try { sessionStorage.removeItem('xonaris_ban_reason'); } catch { /* ignore */ }
        return { isBanned: false };
      }
    } catch (err: unknown) {
      setUser(null);
      // Check for 403 ban response
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: { message?: string; ban_reason?: string } } };
        if (axiosErr.response?.status === 403 && axiosErr.response?.data?.message === 'Compte banni') {
          setIsBanned(true);
          setBanReason(axiosErr.response.data.ban_reason ?? null);
          return { isBanned: true };
        }
      }
      // Fallback: sessionStorage set by the interceptor when it first caught a 403.
      try {
        const stored = sessionStorage.getItem('xonaris_ban_reason');
        if (stored !== null) {
          setIsBanned(true);
          setBanReason(stored || null);
          return { isBanned: true };
        }
      } catch { /* ignore */ }
      return { isBanned: false };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Safety net: never stay in loading=true beyond 12 s (covers axios 10s timeout + margin)
    const timeout = setTimeout(() => setLoading(false), 12_000);
    refresh().finally(() => clearTimeout(timeout));
  }, [refresh]);

  const login = () => {
    window.location.href = authApi.getDiscordLoginUrl();
  };

  const logout = async () => {
    try { await authApi.logout(); } finally {
      setUser(null);
      setIsBanned(false);
      setBanReason(null);
      sessionStorage.removeItem('xonaris_ban_reason');
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'ADMIN',
      isMaintenance,
      maintenanceReason,
      isBanned,
      banReason,
      premiumPrice,
      announcementActive,
      announcementText,
      announcementColor,
      bckgrndBanned,
      bckgrndMaintenance,
      login, logout, refresh,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
