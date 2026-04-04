import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [news, total] = await Promise.all([
      this.prisma.news.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: { select: { likes: true } },
          ...(userId
            ? { likes: { where: { user_id: userId }, select: { id: true } } }
            : {}),
        },
      }),
      this.prisma.news.count(),
    ]);

    return {
      items: news.map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        image_url: n.image_url ?? null,
        created_at: n.created_at,
        updated_at: n.updated_at,
        likes_count: n._count.likes,
        liked_by_me: userId ? n.likes?.length > 0 : false,
      })),
      total,
      page,
      limit,
    };
  }

  async findById(id: string, userId?: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
      include: {
        _count: { select: { likes: true } },
        ...(userId
          ? { likes: { where: { user_id: userId }, select: { id: true } } }
          : {}),
      },
    });
    if (!news) throw new NotFoundException('Article introuvable');

    return {
      id: news.id,
      title: news.title,
      content: news.content,
      image_url: news.image_url ?? null,
      created_at: news.created_at,
      updated_at: news.updated_at,
      likes_count: (news as any)._count.likes,
      liked_by_me: userId ? (news as any).likes?.length > 0 : false,
    };
  }

  async likeNews(userId: string, newsId: string) {
    const news = await this.prisma.news.findUnique({ where: { id: newsId } });
    if (!news) throw new NotFoundException('Article introuvable');

    const existing = await this.prisma.newsLike.findUnique({
      where: { user_id_news_id: { user_id: userId, news_id: newsId } },
    });
    if (existing) throw new ConflictException('Vous aimez déjà cet article');

    await this.prisma.newsLike.create({
      data: { user_id: userId, news_id: newsId },
    });
    const count = await this.prisma.newsLike.count({ where: { news_id: newsId } });
    return { liked: true, likes_count: count };
  }

  async unlikeNews(userId: string, newsId: string) {
    const existing = await this.prisma.newsLike.findUnique({
      where: { user_id_news_id: { user_id: userId, news_id: newsId } },
    });
    if (!existing) throw new NotFoundException('Like introuvable');

    await this.prisma.newsLike.delete({ where: { id: existing.id } });
    const count = await this.prisma.newsLike.count({ where: { news_id: newsId } });
    return { liked: false, likes_count: count };
  }
}
