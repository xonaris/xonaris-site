import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generatePremiumCode } from '../common/utils/codes';
import { encrypt, decrypt } from '../common/utils/encryption';
import {
  CreateChannelDto,
  UpdateChannelDto,
  CreateChannelSourceDto,
  UpdateChannelSourceDto,
  GeneratePremiumCodesDto,
  BanUserDto,
  CreateNewsDto,
  UpdateNewsDto,
  CreateAdDto,
  UpdateAdDto,
} from './dto/admin.dto';
import { ReportStatus } from '@prisma/client';

/** Maximum items per page for admin listings */
const MAX_PAGE_LIMIT = 100;

/** Whitelist of allowed setting keys */
const ALLOWED_SETTING_KEYS: ReadonlySet<string> = new Set([
  'background_landing',
  'premium_price',
  'announcement_active',
  'announcement_text',
  'announcement_color',
  'maintenance_active',
  'maintenance_reason',
  'bckgrnd_banned',
  'bckgrnd_maintenance'
]);

/** Reusable select for user list views */
const USER_LIST_SELECT = {
  id: true,
  discord_id: true,
  username_discord: true,
  avatar_discord: true,
  pseudo: true,
  role: true,
  is_premium: true,
  premium_expires_at: true,
  referral_code: true,
  referral_count: true,
  favorites_count: true,
  reports_count: true,
  is_banned: true,
  ban_reason: true,
  banned_at: true,
  created_at: true,
  last_login_at: true,
  first_ip: true,
  last_ip: true,
} as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════════
  // ── USERS
  // ══════════════════════════════════════════════

  async getUsers(page = 1, limit = 50, search?: string) {
    limit = Math.min(limit, MAX_PAGE_LIMIT);
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { pseudo: { contains: search, mode: 'insensitive' as const } },
            { discord_id: { contains: search } },
            {
              username_discord: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where,
        orderBy: { created_at: 'desc' },
        select: USER_LIST_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);

    // Decrypt IPs for admin view
    const decryptedUsers = users.map((u: any) => ({
      ...u,
      first_ip: u.first_ip ? (() => { try { return decrypt(u.first_ip); } catch { return u.first_ip; } })() : null,
      last_ip: u.last_ip ? (() => { try { return decrypt(u.last_ip); } catch { return u.last_ip; } })() : null,
    }));

    return { users: decryptedUsers, total, page, limit };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_LIST_SELECT,
        premium_started_at: true,
        premium_activated_by_code: true,
        premium_activation_count: true,
        referred_by: true,
        ban_history: true,
        user_agent: true,
        device_type: true,
        country: true,
        favorites: {
          include: { channel: { select: { id: true, name: true } } },
        },
        reports: {
          include: { channel: { select: { id: true, name: true } } },
        },
        used_codes: {
          select: { code: true, duration_days: true, used_at: true },
        },
        login_logs: {
          take: 20,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            ip: true,
            user_agent: true,
            device_type: true,
            country: true,
            created_at: true,
          },
        },
        action_logs: {
          take: 50,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            action: true,
            details: true,
            created_at: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Decrypt IPs for admin view
    const result = user as any;
    if (result.first_ip) { try { result.first_ip = decrypt(result.first_ip); } catch {} }
    if (result.last_ip) { try { result.last_ip = decrypt(result.last_ip); } catch {} }
    if (result.login_logs) {
      result.login_logs = result.login_logs.map((log: any) => ({
        ...log,
        ip: log.ip ? (() => { try { return decrypt(log.ip); } catch { return log.ip; } })() : null,
      }));
    }

    return result;
  }

  async deleteUser(id: string, currentUserId?: string) {
    if (currentUserId && id === currentUserId)
      throw new ForbiddenException('Impossible de supprimer votre propre compte');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role === 'ADMIN')
      throw new ForbiddenException('Impossible de supprimer un administrateur');
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Utilisateur supprimé' };
  }

  async banUser(id: string, dto: BanUserDto, currentUserId?: string) {
    if (currentUserId && id === currentUserId)
      throw new ForbiddenException('Impossible de bannir votre propre compte');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role === 'ADMIN')
      throw new ForbiddenException('Impossible de bannir un administrateur');

    const now = new Date();
    const history = (user.ban_history as any[]) || [];
    history.push({
      reason: dto.reason,
      banned_at: now.toISOString(),
      unbanned_at: null,
    });

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          is_banned: true,
          ban_reason: dto.reason,
          banned_at: now,
          ban_history: history,
          // Note: session_token is NOT nulled out — the JwtAuthGuard's
          // is_banned check already blocks all requests. Keeping the token
          // intact allows the frontend to immediately detect an unban via
          // a fresh getMe() call without requiring re-authentication.
        },
        select: {
          id: true,
          pseudo: true,
          is_banned: true,
          ban_reason: true,
          banned_at: true,
        },
      }),
      this.prisma.actionLog.create({
        data: { user_id: id, action: 'BAN', details: { reason: dto.reason } },
      }),
    ]);
    return updated;
  }

  async unbanUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const history = (user.ban_history as any[]) || [];
    if (history.length > 0) {
      history[history.length - 1].unbanned_at = new Date().toISOString();
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          is_banned: false,
          ban_reason: null,
          banned_at: null,
          ban_history: history,
        },
        select: { id: true, pseudo: true, is_banned: true },
      }),
      this.prisma.actionLog.create({
        data: { user_id: id, action: 'UNBAN' },
      }),
    ]);
    return updated;
  }

  async getBannedUsers(page = 1, limit = 50) {
    limit = Math.min(limit, MAX_PAGE_LIMIT);
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { is_banned: true },
        skip,
        take: limit,
        orderBy: { banned_at: 'desc' },
        select: USER_LIST_SELECT,
      }),
      this.prisma.user.count({ where: { is_banned: true } }),
    ]);
    return { users, total, page, limit };
  }

  // ══════════════════════════════════════════════
  // ── CHANNELS
  // ══════════════════════════════════════════════

  async getAllChannels(
    page = 1,
    limit = 50,
    search?: string,
    category?: string,
    status?: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'PREMIUM',
    sortKey: 'name' | 'sort_order' | 'category' | 'created_at' = 'sort_order',
    sortDir: 'asc' | 'desc' = 'asc',
  ) {
    limit = Math.min(limit, MAX_PAGE_LIMIT);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category && category !== 'ALL') where.category = category;
    if (status === 'ACTIVE') where.is_active = true;
    if (status === 'INACTIVE') where.is_active = false;
    if (status === 'PREMIUM') where.is_premium = true;

    const orderBy: any =
      sortKey === 'name' ? { name: sortDir }
      : sortKey === 'category' ? { category: sortDir }
      : sortKey === 'created_at' ? { created_at: sortDir }
      : { sort_order: sortDir };

    const [items, total] = await Promise.all([
      this.prisma.channel.findMany({
        skip,
        take: limit,
        where,
        orderBy,
        include: { sources: { orderBy: { sort_order: 'asc' } } },
      }),
      this.prisma.channel.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getChannelById(id: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: { sources: { orderBy: { sort_order: 'asc' } } },
    });
    if (!channel) throw new NotFoundException('Chaîne introuvable');
    return channel;
  }

  async createChannel(dto: CreateChannelDto) {
    const existing = await this.prisma.channel.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('Ce slug existe déjà');
    const data = { ...dto, hls_url: dto.hls_url ? encrypt(dto.hls_url) : '' };
    return this.prisma.channel.create({ data });
  }

  async updateChannel(id: string, dto: UpdateChannelDto) {
    const channel = await this.prisma.channel.findUnique({ where: { id } });
    if (!channel) throw new NotFoundException('Chaîne introuvable');

    if (dto.slug && dto.slug !== channel.slug) {
      const dup = await this.prisma.channel.findUnique({
        where: { slug: dto.slug },
      });
      if (dup) throw new ConflictException('Ce slug existe déjà');
    }
    return this.prisma.channel.update({
      where: { id },
      data: dto.hls_url !== undefined
        ? { ...dto, hls_url: dto.hls_url ? encrypt(dto.hls_url) : '' }
        : dto,
    });
  }

  async deleteChannel(id: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id } });
    if (!channel) throw new NotFoundException('Chaîne introuvable');
    await this.prisma.channel.delete({ where: { id } });
    return { message: 'Chaîne supprimée' };
  }

  // ══════════════════════════════════════════════
  // ── CHANNEL SOURCES
  // ══════════════════════════════════════════════

  async getChannelSources(channelId: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Chaîne introuvable');
    return this.prisma.channelSource.findMany({
      where: { channel_id: channelId },
      orderBy: { sort_order: 'asc' },
    });
  }

  async createChannelSource(channelId: string, dto: CreateChannelSourceDto) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Chaîne introuvable');
    const data = { channel_id: channelId, ...dto, hls_url: encrypt(dto.hls_url) };
    return this.prisma.channelSource.create({ data });
  }

  async updateChannelSource(channelId: string, sourceId: string, dto: UpdateChannelSourceDto) {
    const source = await this.prisma.channelSource.findFirst({
      where: { id: sourceId, channel_id: channelId },
    });
    if (!source) throw new NotFoundException('Source introuvable');
    const data = dto.hls_url !== undefined
      ? { ...dto, hls_url: dto.hls_url ? encrypt(dto.hls_url) : '' }
      : dto;
    return this.prisma.channelSource.update({
      where: { id: sourceId },
      data,
    });
  }

  async deleteChannelSource(channelId: string, sourceId: string) {
    const source = await this.prisma.channelSource.findFirst({
      where: { id: sourceId, channel_id: channelId },
    });
    if (!source) throw new NotFoundException('Source introuvable');
    await this.prisma.channelSource.delete({ where: { id: sourceId } });
    return { message: 'Source supprimée' };
  }

  // ══════════════════════════════════════════════
  // ── PREMIUM CODES
  // ══════════════════════════════════════════════

  async generatePremiumCodes(dto: GeneratePremiumCodesDto) {
    const codes: string[] = [];
    for (let i = 0; i < dto.count; i++) {
      let code: string;
      let attempts = 0;
      let unique = false;
      do {
        code = generatePremiumCode();
        const exists = await this.prisma.premiumCode.findUnique({
          where: { code },
        });
        if (!exists) {
          unique = true;
          break;
        }
        attempts++;
      } while (attempts < 10);
      if (!unique) {
        throw new ConflictException('Impossible de générer un code unique après plusieurs tentatives');
      }
      codes.push(code);
    }

    const created = await this.prisma.premiumCode.createMany({
      data: codes.map((c) => ({ code: c, duration_days: dto.duration_days })),
    });
    return { count: created.count, codes, duration_days: dto.duration_days };
  }

  async getAllPremiumCodes(page = 1, limit = 50) {
    limit = Math.min(limit, MAX_PAGE_LIMIT);
    const skip = (page - 1) * limit;
    const [codes, total] = await Promise.all([
      this.prisma.premiumCode.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { id: true, pseudo: true } } },
      }),
      this.prisma.premiumCode.count(),
    ]);
    return { codes, total, page, limit };
  }

  async deletePremiumCode(id: string) {
    const code = await this.prisma.premiumCode.findUnique({ where: { id } });
    if (!code) throw new NotFoundException('Code introuvable');
    if (code.used)
      throw new ConflictException('Impossible de supprimer un code utilisé');
    await this.prisma.premiumCode.delete({ where: { id } });
    return { message: 'Code supprimé' };
  }

  // ══════════════════════════════════════════════
  // ── REPORTS
  // ══════════════════════════════════════════════

  async getAllReports(status?: ReportStatus) {
    const where = status ? { status } : {};
    return this.prisma.report.findMany({
      where,
      include: {
        user: { select: { id: true, pseudo: true } },
        channel: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateReport(
    id: string,
    status: ReportStatus,
    adminResponse?: string,
  ) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Signalement introuvable');

    const [updated] = await Promise.all([
      this.prisma.report.update({
        where: { id },
        data: { status, admin_response: adminResponse || null },
        include: {
          user: { select: { id: true, pseudo: true } },
          channel: { select: { id: true, name: true } },
        },
      }),
      this.prisma.actionLog.create({
        data: {
          user_id: report.user_id,
          action: 'REPORT_RESOLVE',
          details: {
            report_id: id,
            status,
            admin_response: adminResponse || null,
          },
        },
      }),
    ]);
    return updated;
  }

  // ══════════════════════════════════════════════
  // ── NEWS
  // ══════════════════════════════════════════════

  async createNews(dto: CreateNewsDto) {
    return this.prisma.news.create({ data: dto });
  }

  async updateNews(id: string, dto: UpdateNewsDto) {
    const news = await this.prisma.news.findUnique({ where: { id } });
    if (!news) throw new NotFoundException('Article introuvable');
    return this.prisma.news.update({ where: { id }, data: dto });
  }

  async deleteNews(id: string) {
    const news = await this.prisma.news.findUnique({ where: { id } });
    if (!news) throw new NotFoundException('Article introuvable');
    await this.prisma.news.delete({ where: { id } });
    return { message: 'Article supprimé' };
  }

  async getAllNews() {
    const news = await this.prisma.news.findMany({
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { likes: true } } },
    });
    return news.map((n: any) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      image_url: n.image_url ?? null,
      created_at: n.created_at,
      likes_count: n._count.likes,
      liked_by_me: false,
    }));
  }

  async getNewsById(id: string) {
    const n = await this.prisma.news.findUnique({
      where: { id },
      include: { _count: { select: { likes: true } } },
    });
    if (!n) throw new NotFoundException('Article introuvable');
    return {
      id: n.id,
      title: n.title,
      content: n.content,
      image_url: n.image_url ?? null,
      created_at: n.created_at,
      likes_count: (n as any)._count.likes,
      liked_by_me: false,
    };
  }

  // ══════════════════════════════════════════════
  // ── SETTINGS
  // ══════════════════════════════════════════════

  async getSettings() {
    return this.prisma.setting.findMany();
  }

  async updateSetting(key: string, value: string) {
    if (!ALLOWED_SETTING_KEYS.has(key)) {
      throw new BadRequestException('Clé de paramètre non autorisée');
    }
    return this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  // ══════════════════════════════════════════════
  // ── STATS
  // ══════════════════════════════════════════════

  async getStats() {
    const [
      totalUsers,
      premiumUsers,
      bannedUsers,
      totalChannels,
      activeChannels,
      totalReports,
      pendingReports,
      totalCodes,
      usedCodes,
      totalLogins,
      totalLikes,
      totalNews,
      totalFavorites,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { is_premium: true } }),
      this.prisma.user.count({ where: { is_banned: true } }),
      this.prisma.channel.count(),
      this.prisma.channel.count({ where: { is_active: true } }),
      this.prisma.report.count(),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
      this.prisma.premiumCode.count(),
      this.prisma.premiumCode.count({ where: { used: true } }),
      this.prisma.loginLog.count(),
      this.prisma.newsLike.count(),
      this.prisma.news.count(),
      this.prisma.favorite.count(),
    ]);

    return {
      users: { total: totalUsers, premium: premiumUsers, banned: bannedUsers },
      channels: { total: totalChannels, active: activeChannels },
      reports: { total: totalReports, pending: pendingReports },
      premium_codes: { total: totalCodes, used: usedCodes },
      activity: { total_logins: totalLogins, total_likes: totalLikes },
      news: { total: totalNews },
      favorites: { total: totalFavorites },
    };
  }

  async getStatsHistory(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Daily registrations
    const registrations = await this.prisma.$queryRaw<
      { date: Date; count: bigint }[]
    >`
      SELECT DATE_TRUNC('day', created_at) as date, COUNT(*)::bigint as count
      FROM users
      WHERE created_at >= ${since}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `;

    // Daily logins
    const logins = await this.prisma.$queryRaw<
      { date: Date; count: bigint }[]
    >`
      SELECT DATE_TRUNC('day', created_at) as date, COUNT(*)::bigint as count
      FROM login_logs
      WHERE created_at >= ${since}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `;

    // Daily reports
    const reports = await this.prisma.$queryRaw<
      { date: Date; count: bigint }[]
    >`
      SELECT DATE_TRUNC('day', created_at) as date, COUNT(*)::bigint as count
      FROM reports
      WHERE created_at >= ${since}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `;

    // Daily premium activations
    const premiumActivations = await this.prisma.$queryRaw<
      { date: Date; count: bigint }[]
    >`
      SELECT DATE_TRUNC('day', used_at) as date, COUNT(*)::bigint as count
      FROM premium_codes
      WHERE used = true AND used_at >= ${since}
      GROUP BY DATE_TRUNC('day', used_at)
      ORDER BY date ASC
    `;

    // Build a complete date range
    const dateMap = new Map<string, { registrations: number; logins: number; reports: number; premium: number }>();
    for (let d = new Date(since); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      dateMap.set(key, { registrations: 0, logins: 0, reports: 0, premium: 0 });
    }

    for (const r of registrations) {
      const key = new Date(r.date).toISOString().split('T')[0];
      const entry = dateMap.get(key);
      if (entry) entry.registrations = Number(r.count);
    }
    for (const r of logins) {
      const key = new Date(r.date).toISOString().split('T')[0];
      const entry = dateMap.get(key);
      if (entry) entry.logins = Number(r.count);
    }
    for (const r of reports) {
      const key = new Date(r.date).toISOString().split('T')[0];
      const entry = dateMap.get(key);
      if (entry) entry.reports = Number(r.count);
    }
    for (const r of premiumActivations) {
      const key = new Date(r.date).toISOString().split('T')[0];
      const entry = dateMap.get(key);
      if (entry) entry.premium = Number(r.count);
    }

    const history = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    return { history };
  }

  // ══════════════════════════════════════════════
  // ── ADS
  // ══════════════════════════════════════════════

  async getAllAds() {
    const ads = await this.prisma.ad.findMany({ orderBy: { created_at: 'desc' } });
    // Decrypt URLs for admin display
    return ads.map((ad) => {
      let url = ad.url;
      try { url = decrypt(ad.url); } catch {}
      return { ...ad, url };
    });
  }

  async createAd(dto: CreateAdDto) {
    return this.prisma.ad.create({
      data: {
        name: dto.name,
        url: encrypt(dto.url),
        is_active: dto.is_active ?? true,
      },
    });
  }

  async updateAd(id: string, dto: UpdateAdDto) {
    const ad = await this.prisma.ad.findUnique({ where: { id } });
    if (!ad) throw new NotFoundException('Publicité introuvable');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.url !== undefined) data.url = encrypt(dto.url);
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    return this.prisma.ad.update({ where: { id }, data });
  }

  async deleteAd(id: string) {
    const ad = await this.prisma.ad.findUnique({ where: { id } });
    if (!ad) throw new NotFoundException('Publicité introuvable');
    await this.prisma.ad.delete({ where: { id } });
    return { deleted: true };
  }
}
