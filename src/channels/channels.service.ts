import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    const channels = await this.prisma.channel.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        logo_url: true,
        is_premium: true,
        sources: {
          where: { is_active: true },
          orderBy: { sort_order: 'asc' },
          select: {
            id: true,
            label: true,
            is_premium: true,
            sort_order: true,
          },
        },
      },
    });
    return channels;
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
