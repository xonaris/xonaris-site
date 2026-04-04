export interface User {
  id: string;
  pseudo: string;
  username_discord: string | null;
  avatar_discord: string | null;
  role: 'USER' | 'ADMIN';
  is_premium: boolean;
  premium_started_at: string | null;
  premium_expires_at: string | null;
  referral_code: string;
  referral_count: number;
  favorites_count: number;
  reports_count: number;
  is_banned: boolean;
  ban_reason: string | null;
  created_at: string;
  last_login_at: string | null;
  discord_id?: string;
}

export interface ChannelSource {
  id: string;
  label: string;
  is_premium: boolean;
  sort_order: number;
}

export interface ChannelSourceFull extends ChannelSource {
  channel_id: string;
  hls_url: string;
  is_active: boolean;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  category: string;
  logo_url: string | null;
  is_premium: boolean;
  sources?: ChannelSource[];
}

export interface ChannelFull extends Channel {
  hls_url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  sources: ChannelSourceFull[];
}

export interface Favorite {
  id: string;
  user_id: string;
  channel_id: string;
  created_at: string;
  channel: Channel;
}

export interface Report {
  id: string;
  user_id: string;
  channel_id: string;
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'REFUSED';
  admin_response: string | null;
  created_at: string;
  channel?: { id: string; name: string };
  user?: { id: string; pseudo: string };
}

export interface News {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  liked_by_me: boolean;
}

export interface MaintenanceStatus {
  active: boolean;
  reason: string | null;
}

export interface AdminUser extends User {
  discord_id: string;
  username_discord: string | null;
  avatar_discord: string | null;
  referred_by: string | null;
  favorites_count: number;
  reports_count: number;
  last_login_at: string | null;
  first_ip: string | null;
  last_ip: string | null;
  favorites?: { id: string; channel?: { id: string; name: string }; channel_id: string }[];
  reports?: Report[];
  used_codes?: { id: string; code: string; duration_days: number; used_at: string }[];
  login_logs?: { id: string; ip: string; user_agent: string; created_at: string }[];
  action_logs?: { id: string; action: string; details: unknown; created_at: string }[];
}

export interface PremiumCode {
  id: string;
  code: string;
  duration_days: number;
  used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  user?: { id: string; pseudo: string } | null;
}

export interface AdminStats {
  users: { total: number; premium: number; banned: number };
  channels: { total: number; active: number };
  reports: { total: number; pending: number };
  premium_codes: { total: number; used: number };
  activity: { total_logins: number; total_likes: number };
  news: { total: number };
  favorites: { total: number };
}

export interface StatsHistoryEntry {
  date: string;
  registrations: number;
  logins: number;
  reports: number;
  premium: number;
}

export interface StatsHistory {
  history: StatsHistoryEntry[];
}

export interface Setting {
  key: string;
  value: string;
  created_at?: string;
  updated_at?: string;
}

export interface Ad {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
