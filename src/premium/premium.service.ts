import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PremiumService {
  constructor(private readonly prisma: PrismaService) {}

  async redeemCode(userId: string, code: string) {
    const now = new Date();

    // 1. Check user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // 2. Atomically claim the code (prevents race conditions)
    const claimResult = await this.prisma.premiumCode.updateMany({
      where: { code, used: false },
      data: { used: true, used_by: userId, used_at: now },
    });
    if (claimResult.count === 0) {
      throw new ConflictException('Code invalide ou déjà utilisé');
    }

    // 3. Fetch claimed code for duration
    const premiumCode = await this.prisma.premiumCode.findUnique({
      where: { code },
    });
    if (!premiumCode) {
      throw new NotFoundException('Code invalide');
    }

    // 4. Re-verify premium status AFTER claiming the code to eliminate TOCTOU:
    //    two concurrent requests with different codes could both pass the early
    //    check before either writes is_premium=true. Re-reading here ensures only
    //    one code is consumed per already-active subscription.
    const freshUser = await this.prisma.user.findUnique({ where: { id: userId } });
    const isNowPremium =
      freshUser?.is_premium &&
      freshUser.premium_expires_at !== null &&
      freshUser.premium_expires_at > now;
    if (isNowPremium) {
      // Release the code so it can be used later
      await this.prisma.premiumCode.update({
        where: { code },
        data: { used: false, used_by: null, used_at: null },
      });
      throw new ConflictException('Vous êtes déjà Premium');
    }

    // 5. Activate premium
    const expiresAt = new Date(
      now.getTime() + premiumCode.duration_days * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction([
      // Update user premium status
      this.prisma.user.update({
        where: { id: userId },
        data: {
          is_premium: true,
          premium_started_at: now,
          premium_expires_at: expiresAt,
          premium_activated_by_code: premiumCode.code,
          premium_activation_count: { increment: 1 },
        },
      }),
      // Log action
      this.prisma.actionLog.create({
        data: {
          user_id: userId,
          action: 'PREMIUM_ACTIVATE',
          details: {
            code: premiumCode.code,
            duration_days: premiumCode.duration_days,
            expires_at: expiresAt.toISOString(),
          },
        },
      }),
    ]);

    return {
      message: 'Premium activé avec succès',
      expires_at: expiresAt,
      duration_days: premiumCode.duration_days,
    };
  }

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    const now = new Date();
    const active =
      user.is_premium &&
      user.premium_expires_at !== null &&
      user.premium_expires_at > now;
    return {
      is_premium: active,
      premium_expires_at: user.premium_expires_at ?? null,
      premium_started_at: user.premium_started_at ?? null,
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expireOutdatedPremiums() {
    // Find users whose premium has expired
    const expiring = await this.prisma.user.findMany({
      where: {
        is_premium: true,
        premium_expires_at: { lt: new Date() },
      },
      select: { id: true },
    });

    if (expiring.length === 0) return;

    // Update all expired users and create individual ActionLogs
    await this.prisma.$transaction([
      this.prisma.user.updateMany({
        where: { id: { in: expiring.map(u => u.id) } },
        data: { is_premium: false, premium_expires_at: null },
      }),
      ...expiring.map(u =>
        this.prisma.actionLog.create({
          data: {
            user_id: u.id,
            action: 'PREMIUM_EXPIRE',
            details: { expired_by: 'cron' },
          },
        }),
      ),
    ]);
  }
}
