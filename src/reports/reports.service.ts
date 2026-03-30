import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, channelId: string, reason: string) {
    // Check channel exists
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException('Chaîne introuvable');

    // ── Cooldown: max 5 reports per hour ──
    const recentCount = await this.prisma.report.count({
      where: {
        user_id: userId,
        created_at: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentCount >= 5) {
      throw new BadRequestException('Limite de signalements atteinte (5/heure)');
    }

    // Check for existing pending report (1 max)
    const existing = await this.prisma.report.findFirst({
      where: { user_id: userId, status: 'PENDING' },
    });
    if (existing) {
      throw new ConflictException(
        'Vous avez déjà un signalement en attente de traitement',
      );
    }

    // Create report + increment counter + log
    const [report] = await this.prisma.$transaction([
      this.prisma.report.create({
        data: { user_id: userId, channel_id: channelId, reason },
        include: {
          channel: { select: { id: true, name: true } },
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { reports_count: { increment: 1 } },
      }),
      this.prisma.actionLog.create({
        data: {
          user_id: userId,
          action: 'REPORT_CREATE',
          details: { channel_id: channelId, reason },
        },
      }),
    ]);

    return report;
  }

  async findAllByUser(userId: string) {
    return this.prisma.report.findMany({
      where: { user_id: userId },
      include: {
        channel: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
