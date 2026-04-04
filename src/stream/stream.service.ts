import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateStreamToken, verifyStreamToken } from '../common/utils/stream-token';
import { verifyAdToken } from '../common/utils/ad-token';
import { decrypt } from '../common/utils/encryption';
import { createHash } from 'crypto';

@Injectable()
export class StreamService {
  constructor(private readonly prisma: PrismaService) {}

  verifyToken(token: string): boolean {
    if (!token) return false;
    const payload = verifyStreamToken(token);
    return payload !== null;
  }

  /**
   * Verify a stream token and return the full payload (including user_id).
   */
  verifyTokenFull(token: string): { user_id: string; channel_id: string; exp: number } | null {
    if (!token) return null;
    return verifyStreamToken(token);
  }

  /**
   * Lightweight ban check — prevents banned users from streaming with old tokens.
   * Cached per-request (no in-memory TTL) to keep latency negligible.
   */
  async isUserBanned(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { is_banned: true },
    });
    return user?.is_banned === true;
  }

  /**
   * Resolve the actual HLS URL for a given opaque stream ID.
   * Called by the stream proxy controller — never exposed to clients.
   *
   * @param streamId  Opaque ID: "src-<sourceId>" or "ch-<channelId>"
   * @param expectedChannelId  The channel_id embedded in the stream token — must match
   */
  async resolveHlsUrl(streamId: string, expectedChannelId: string): Promise<string | null> {
    // streamId format: "src-<sourceId>" or "ch-<channelId>"
    if (streamId.startsWith('src-')) {
      const sourceId = streamId.slice(4);
      const source = await this.prisma.channelSource.findUnique({ where: { id: sourceId } });
      if (!source?.hls_url) return null;
      // Ensure the source belongs to the channel the token was issued for
      if (source.channel_id !== expectedChannelId) return null;
      try { return decrypt(source.hls_url); } catch { return source.hls_url; }
    }
    if (streamId.startsWith('ch-')) {
      const channelId = streamId.slice(3);
      // Ensure the channel matches the token
      if (channelId !== expectedChannelId) return null;
      const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
      if (!channel?.hls_url) return null;
      try { return decrypt(channel.hls_url); } catch { return channel.hls_url; }
    }
    return null;
  }

  async getStreamUrl(channelId: string, user: any, sourceId?: string, adToken?: string): Promise<{ url: string }> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { sources: { where: { is_active: true }, orderBy: { sort_order: 'asc' } } },
    });

    if (!channel) {
      throw new NotFoundException('Chaîne introuvable');
    }

    if (!channel.is_active) {
      throw new NotFoundException('Chaîne indisponible');
    }

    let streamRefId: string;
    let requiresPremium: boolean;

    if (sourceId) {
      const source = channel.sources.find((s) => s.id === sourceId);
      if (!source) throw new NotFoundException('Source introuvable');
      streamRefId = `src-${source.id}`;
      requiresPremium = source.is_premium;
    } else if (channel.sources.length > 0) {
      const source = channel.sources[0];
      streamRefId = `src-${source.id}`;
      requiresPremium = source.is_premium;
    } else {
      streamRefId = `ch-${channel.id}`;
      requiresPremium = channel.is_premium;
    }

    // Check premium requirement
    if (requiresPremium && !user.is_premium) {
      throw new ForbiddenException('Cette source nécessite un abonnement Premium');
    }

    // Non-premium users must present a valid ad proof token
    // (unless no active ads exist — in that case let them through)
    if (!user.is_premium) {
      const adsCount = await this.prisma.ad.count({ where: { is_active: true } });
      if (adsCount > 0) {
        if (!adToken || !verifyAdToken(adToken, user.id, channelId)) {
          throw new ForbiddenException('Veuillez regarder une publicité avant d\'accéder au flux');
        }
      }
    }

    // Generate signed stream token (2h TTL — token is embedded in every HLS segment URL)
    const token = generateStreamToken(user.id, channelId, 7200);

    // Return an opaque proxy URL — the actual hls_url is NEVER sent to the client
    // No /api prefix here: the frontend's streamApi.getStreamUrl() already prepends
    // API_URL (= '/api' in dev) so the final URL becomes /api/stream/proxy/...
    const proxyUrl = `/stream/proxy/${streamRefId}?token=${token}`;

    return { url: proxyUrl };
  }
}
