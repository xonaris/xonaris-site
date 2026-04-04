import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface FindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Paginated channel listing with optional search + category filter.
   * Returns { items, total, page, limit, totalPages }.
   */
  async findAllActive(options: FindAllOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = { is_active: true };

    if (options.category) {
      where.category = options.category;
    }

    if (options.search) {
      where.name = { contains: options.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.channel.findMany({
        where,
        orderBy: { sort_order: 'asc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          logo_url: true,
          is_premium: true,
        },
      }),
      this.prisma.channel.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * List distinct active categories with their channel count.
   * Cached in-memory for 60 s to avoid hitting the DB on every page load.
   */
  private categoryCache: { data: { name: string; count: number }[]; ts: number } | null = null;
  private static CATEGORY_CACHE_TTL = 60_000;

  async getCategories(): Promise<{ name: string; count: number }[]> {
    if (this.categoryCache && Date.now() - this.categoryCache.ts < ChannelsService.CATEGORY_CACHE_TTL) {
      return this.categoryCache.data;
    }

    const rows: { category: string; _count: { _all: number } }[] = await this.prisma.channel.groupBy({
      by: ['category'],
      where: { is_active: true },
      _count: { _all: true },
      orderBy: { _count: { category: 'desc' } },
    } as any);

    const data = (rows as any[]).map((r) => ({
      name: r.category,
      count: (r._count as any)?._all ?? r._count,
    }));

    this.categoryCache = { data, ts: Date.now() };
    return data;
  }

  /**
   * Light random suggestions — for the Watch page sidebar.
   * Returns up to `count` random active channels, optionally in the same category.
   */
  async getSuggestions(excludeId: string, category?: string, count = 6): Promise<any[]> {
    // Use raw SQL for true random sampling (much faster than fetching all + shuffle)
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, slug, category, logo_url, is_premium
       FROM channels
       WHERE is_active = true AND id != $1::uuid
       ${category ? `AND category = $2` : ''}
       ORDER BY RANDOM()
       LIMIT $${category ? 3 : 2}`,
      ...(category ? [excludeId, category, count] : [excludeId, count]),
    );
    return rows;
  }

  async findById(id: string) {
    return this.prisma.channel.findUnique({
      where: { id },
      include: { sources: { where: { is_active: true }, orderBy: { sort_order: 'asc' } } },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.channel.findUnique({
      where: { slug },
      include: { sources: { where: { is_active: true }, orderBy: { sort_order: 'asc' } } },
    });
  }
}
