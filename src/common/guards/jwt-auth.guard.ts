import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['xonaris_token'];

    if (!token) {
      throw new UnauthorizedException('Non authentifié');
    }

    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Utilisateur introuvable');
      }

      if (user.is_banned) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'Compte banni',
          ban_reason: user.ban_reason,
        });
      }

      // ── Session invalidation check ──
      // If session_token is null, the user has been forcefully logged out
      if (!user.session_token) {
        throw new UnauthorizedException('Session invalidée');
      }

      // ── Check token expiration (refresh token expiry = session expiry) ──
      if (user.token_expiration && user.token_expiration < new Date()) {
        throw new UnauthorizedException('Session expirée');
      }

      // ── Auto-expire premium ──
      let isPremium = user.is_premium;
      if (
        isPremium &&
        user.premium_expires_at &&
        user.premium_expires_at < new Date()
      ) {
        isPremium = false;
        this.prisma
          .$transaction([
            this.prisma.user.update({
              where: { id: user.id },
              data: { is_premium: false, premium_expires_at: null },
            }),
            this.prisma.actionLog.create({
              data: { user_id: user.id, action: 'PREMIUM_EXPIRE' },
            }),
          ])
          .catch(() => {
            // Premium expiration failed — will be retried on next auth check
          });
      }

      // ── Attach user to request (public fields only) ──
      request.user = {
        id: user.id,
        discord_id: user.discord_id,
        username_discord: user.username_discord,
        avatar_discord: user.avatar_discord,
        pseudo: user.pseudo,
        role: user.role,
        is_premium: isPremium,
        premium_started_at: user.premium_started_at,
        premium_expires_at: isPremium ? user.premium_expires_at : null,
        referral_code: user.referral_code,
        referral_count: user.referral_count,
        favorites_count: user.favorites_count,
        reports_count: user.reports_count,
        is_banned: user.is_banned,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('Token invalide');
    }
  }
}
