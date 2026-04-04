import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    return this.prisma.favorite.findMany({
      where: { user_id: userId },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            logo_url: true,
            is_premium: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(userId: string, channelId: string) {
    // Check channel exists
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException('Chaîne introuvable');

    // Check no duplicate
    const existing = await this.prisma.favorite.findUnique({
      where: {
        user_id_channel_id: { user_id: userId, channel_id: channelId },
      },
    });
    if (existing) throw new ConflictException('Déjà en favoris');

    // Check 5-favorite limit for non-premium users
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { is_premium: true, favorites_count: true },
    });
    if (user && !user.is_premium && user.favorites_count >= 5) {
      throw new ForbiddenException(
        'Limite de 5 favoris atteinte. Passez Premium pour en ajouter plus.',
      );
    }

    // Create favorite + increment counter + log
    const [favorite] = await this.prisma.$transaction([
      this.prisma.favorite.create({
        data: { user_id: userId, channel_id: channelId },
        include: {
          channel: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              logo_url: true,
              is_premium: true,
            },
          },
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { favorites_count: { increment: 1 } },
      }),
      this.prisma.actionLog.create({
        data: {
          user_id: userId,
          action: 'FAVORITE_ADD',
          details: { channel_id: channelId },
        },
      }),
    ]);

    return favorite;
  }

  async delete(userId: string, favoriteId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: { id: favoriteId },
    });
    if (!favorite || favorite.user_id !== userId) {
      throw new NotFoundException('Favori introuvable');
    }

    await this.prisma.$transaction([
      this.prisma.favorite.delete({ where: { id: favoriteId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { favorites_count: { decrement: 1 } },
      }),
      this.prisma.actionLog.create({
        data: {
          user_id: userId,
          action: 'FAVORITE_REMOVE',
          details: { channel_id: favorite.channel_id },
        },
      }),
    ]);

    return { message: 'Favori supprimé' };
  }
}
