import api from './client';
import { prefetchPublicKey } from './encryption';
import type {
  User, Channel, ChannelFull, ChannelSourceFull, Favorite, Report, News,
  MaintenanceStatus, AdminUser, PremiumCode, AdminStats, StatsHistory, Setting, Ad,
} from '../types';

// Pre-fetch RSA public key as early as possible
prefetchPublicKey();

// ── Auth ─────────────────────────────────────
export const authApi = {
  getPublicConfig: () => api.get<{
    background_landing: string | null;
    premium_price: string | null;
    announcement_active: boolean;
    announcement_text: string | null;
    announcement_color: string | null;
    bckgrnd_banned: string | null;
    bckgrnd_maintenance: string | null;
  }>('/auth/public-config').then((r) => r.data),
  getMe: () => api.get<User>('/users/me').then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  getDiscordLoginUrl: () => '/api/auth/discord?mode=login',
  getDiscordRegisterUrl: (pseudo: string, ref?: string) => {
    const params = new URLSearchParams({ mode: 'register', pseudo });
    if (ref) params.set('ref', ref);
    return `/api/auth/discord?${params.toString()}`;
  },
  /** Real-time pseudo validation (for registration form) */
  checkPseudo: (pseudo: string) =>
    api.post<{ available: boolean; error?: string }>('/auth/check-pseudo', { pseudo }).then((r) => r.data),
  checkReferral: (code: string) =>
    api.post<{ valid: boolean; pseudo: string | null }>('/auth/check-referral', { code }).then((r) => r.data),
  /** Full pre-register validation: pseudo + captcha (+ referral) */
  validateRegister: (pseudo: string, captcha_token: string, referral?: string) =>
    api.post<{ valid: boolean }>('/auth/validate-register', { pseudo, captcha_token, referral }).then((r) => r.data),
};

// ── Users ────────────────────────────────────
export const userApi = {
  getMe: () => api.get<User>('/users/me').then((r) => r.data),
  syncDiscord: () => api.patch<User>('/users/me/sync-discord').then((r) => r.data),
  getDiscordSyncUrl: () => '/api/auth/discord?mode=sync',
};

// ── Channels ─────────────────────────────────
export const channelApi = {
  getAll: () => api.get<Channel[]>('/channels').then((r) => r.data),
  getById: (id: string) => api.get<Channel>(`/channels/${id}`).then((r) => r.data),
};

// ── Stream ───────────────────────────────────
export const streamApi = {
  getStreamUrl: (channelId: string, sourceId?: string, adToken?: string) => {
    const params = new URLSearchParams();
    if (sourceId) params.set('sourceId', sourceId);
    if (adToken) params.set('ad_token', adToken);
    const qs = params.toString();
    return api.get<{ url: string }>(`/stream/${channelId}${qs ? `?${qs}` : ''}`).then((r) => r.data);
  },
};

// ── Favorites ────────────────────────────────
export const favoriteApi = {
  getAll: () => api.get<Favorite[]>('/favorites').then((r) => r.data),
  add: (channelId: string) => api.post<Favorite>('/favorites', { channel_id: channelId }).then((r) => r.data),
  remove: (id: string) => api.delete(`/favorites/${id}`).then((r) => r.data),
};

// ── Reports ──────────────────────────────────
export const reportApi = {
  getMine: () => api.get<Report[]>('/reports/mine').then((r) => r.data),
  create: (channelId: string, reason: string) =>
    api.post<Report>('/reports', { channel_id: channelId, reason }).then((r) => r.data),
};

// ── Premium ──────────────────────────────────
export const premiumApi = {
  redeem: (code: string) => api.post('/premium/redeem', { code }).then((r) => r.data),
  getStatus: () =>
    api
      .get<{ is_premium: boolean; premium_expires_at: string | null; premium_started_at: string | null }>('/premium/status')
      .then((r) => r.data),
};

// ── News ─────────────────────────────────────
export const newsApi = {
  getAll: (page = 1, limit = 20) =>
    api.get<{ items: News[]; total: number; page: number; limit: number }>(
      `/news?page=${page}&limit=${limit}`,
    ).then((r) => r.data),
  getById: (id: string) => api.get<News>(`/news/${id}`).then((r) => r.data),
  like: (id: string) => api.post<{ likes_count: number }>(`/news/${id}/like`).then((r) => r.data),
  unlike: (id: string) => api.delete<{ likes_count: number }>(`/news/${id}/like`).then((r) => r.data),
};

// ── Maintenance ──────────────────────────────
export const maintenanceApi = {
  getStatus: () => api.get<MaintenanceStatus>('/maintenance/status').then((r) => r.data),
};

// ── Ads ──────────────────────────────────────
export const adsApi = {
  /** Fetch a random ad link (non-premium users only, on click) */
  getAd: (channelId: string) =>
    api.post<{ url: string; nonce: string }>('/ads/get', { channel_id: channelId }).then((r) => r.data),
  /** Validate ad viewing and receive a proof token */
  validateAd: (channelId: string, nonce: string) =>
    api.post<{ ad_token: string }>('/ads/validate', { channel_id: channelId, nonce }).then((r) => r.data),
};

// ── Admin ────────────────────────────────────
export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats').then((r) => r.data),
  getStatsHistory: (days = 30) =>
    api.get<StatsHistory>(`/admin/stats/history?days=${days}`).then((r) => r.data),

  // Users
  getUsers: (page = 1, search?: string, limit = 20) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    return api.get<{ users: AdminUser[]; total: number }>(`/admin/users?${params}`).then((r) => r.data);
  },
  getUserById: (id: string) => api.get<AdminUser>(`/admin/users/${id}`).then((r) => r.data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`).then((r) => r.data),
  banUser: (id: string, reason: string) =>
    api.patch(`/admin/users/${id}/ban`, { reason }).then((r) => r.data),
  unbanUser: (id: string) => api.patch(`/admin/users/${id}/unban`).then((r) => r.data),
  getBannedUsers: (page = 1, limit = 20) =>
    api.get<{ users: AdminUser[]; total: number }>(`/admin/bans?page=${page}&limit=${limit}`).then((r) => r.data),

  // Channels
  getChannels: () => api.get<ChannelFull[]>('/admin/channels').then((r) => r.data),
  getChannelById: (id: string) => api.get<ChannelFull>(`/admin/channels/${id}`).then((r) => r.data),
  createChannel: (data: Partial<ChannelFull>) => api.post<ChannelFull>('/admin/channels', data).then((r) => r.data),
  updateChannel: (id: string, data: Partial<ChannelFull>) =>
    api.put(`/admin/channels/${id}`, data).then((r) => r.data),
  deleteChannel: (id: string) => api.delete(`/admin/channels/${id}`).then((r) => r.data),

  // Channel sources
  getChannelSources: (channelId: string) =>
    api.get<ChannelSourceFull[]>(`/admin/channels/${channelId}/sources`).then((r) => r.data),
  createChannelSource: (channelId: string, data: Partial<ChannelSourceFull>) =>
    api.post<ChannelSourceFull>(`/admin/channels/${channelId}/sources`, data).then((r) => r.data),
  updateChannelSource: (channelId: string, sourceId: string, data: Partial<ChannelSourceFull>) =>
    api.put<ChannelSourceFull>(`/admin/channels/${channelId}/sources/${sourceId}`, data).then((r) => r.data),
  deleteChannelSource: (channelId: string, sourceId: string) =>
    api.delete(`/admin/channels/${channelId}/sources/${sourceId}`).then((r) => r.data),

  // Premium codes
  getPremiumCodes: (page = 1) =>
    api.get<{ codes: PremiumCode[]; total: number }>(`/admin/premium-codes?page=${page}`).then((r) => r.data),
  generatePremiumCodes: (durationDays: number, count = 1) =>
    api.post('/admin/premium-codes', { duration_days: durationDays, count }).then((r) => r.data),
  deletePremiumCode: (id: string) => api.delete(`/admin/premium-codes/${id}`).then((r) => r.data),

  // Reports
  getReports: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return api.get<Report[]>(`/admin/reports${params}`).then((r) => r.data);
  },
  updateReport: (id: string, status: string, adminResponse?: string) =>
    api.patch(`/admin/reports/${id}`, { status, admin_response: adminResponse }).then((r) => r.data),

  // News
  getNews: () => api.get<News[]>('/admin/news').then((r) => r.data),
  getNewsById: (id: string) => api.get<News>(`/admin/news/${id}`).then((r) => r.data),
  createNews: (data: { title: string; content: string; image_url?: string }) =>
    api.post('/admin/news', data).then((r) => r.data),
  updateNews: (id: string, data: { title?: string; content?: string; image_url?: string }) =>
    api.put(`/admin/news/${id}`, data).then((r) => r.data),
  deleteNews: (id: string) => api.delete(`/admin/news/${id}`).then((r) => r.data),

  // Maintenance
  getMaintenanceStatus: () => api.get<MaintenanceStatus>('/admin/maintenance').then((r) => r.data),
  toggleMaintenance: (enabled: boolean, reason?: string) =>
    api.patch<MaintenanceStatus>('/admin/maintenance', { active: enabled, reason }).then((r) => r.data),

  // Settings
  getSettings: () => api.get<Setting[]>('/admin/settings').then((r) => r.data),
  updateSetting: (key: string, value: string) =>
    api.put<Setting>(`/admin/settings/${key}`, { value }).then((r) => r.data),

  // Ads
  getAds: () => api.get<Ad[]>('/admin/ads').then((r) => r.data),
  createAd: (data: { name: string; url: string; is_active?: boolean }) =>
    api.post<Ad>('/admin/ads', data).then((r) => r.data),
  updateAd: (id: string, data: { name?: string; url?: string; is_active?: boolean }) =>
    api.put<Ad>(`/admin/ads/${id}`, data).then((r) => r.data),
  deleteAd: (id: string) => api.delete(`/admin/ads/${id}`).then((r) => r.data),
};
