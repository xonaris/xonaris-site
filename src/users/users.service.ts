import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByDiscordId(discordId: string) {
    return this.prisma.user.findUnique({ where: { discord_id: discordId } });
  }

  /**
   * Return only public-safe fields for the authenticated user.
   */
  async getPublicProfile(user: any) {
    return {
      id: user.id,
      pseudo: user.pseudo,
      username_discord: user.username_discord,
      avatar_discord: user.avatar_discord,
      is_premium: user.is_premium,
      premium_started_at: user.premium_started_at,
      premium_expires_at: user.premium_expires_at,
      referral_code: user.referral_code,
      referral_count: user.referral_count,
      favorites_count: user.favorites_count,
      reports_count: user.reports_count,
      role: user.role,
      is_banned: user.is_banned,
      ban_reason: user.ban_reason,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
    };
  }

  /**
   * Sync Discord avatar/username.
   * Since we don't store OAuth refresh tokens, a true sync requires
   * the user to re-authenticate via Discord. This method just marks
   * the intent and the next login will fully update the avatar.
   */
  async syncDiscord(userId: string, expectedDiscordId: string, _token?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utilisateur introuvable');

    // Mark sync intent — actual data will update on next OAuth login.
    // The frontend should redirect the user to the Discord OAuth flow
    // with mode=sync for a real profile refresh.
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        last_oauth_refresh: new Date(),
      },
    });

    await this.prisma.actionLog.create({
      data: {
        user_id: userId,
        action: 'DISCORD_SYNC',
        details: { discord_id: expectedDiscordId, note: 'Sync requested — full update on next OAuth' },
      },
    });

    return this.getPublicProfile(updatedUser);
  }

  /**
   * Check and expire premium if needed.
   */
  async checkPremiumStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    if (
      user.is_premium &&
      user.premium_expires_at &&
      user.premium_expires_at < new Date()
    ) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { is_premium: false, premium_expires_at: null },
      });
      return { ...user, is_premium: false, premium_expires_at: null };
    }

    return user;
  }
}
