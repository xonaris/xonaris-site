import { Controller, Get, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { ChannelsService } from './channels.service';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  /**
   * Paginated channel listing.
   * GET /channels?page=1&limit=50&search=TF1&category=Généraliste
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.channelsService.findAllActive({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search: search || undefined,
      category: category && category !== 'Toutes' ? category : undefined,
    });
  }

  /**
   * List distinct categories with channel count.
   * GET /channels/categories
   */
  @Get('categories')
  @UseGuards(JwtAuthGuard)
  async getCategories() {
    return this.channelsService.getCategories();
  }

  /**
   * Random channel suggestions (for Watch page sidebar).
   * GET /channels/suggestions?exclude=<id>&category=Sport&count=6
   */
  @Get('suggestions')
  @UseGuards(JwtAuthGuard)
  async getSuggestions(
    @Query('exclude') exclude?: string,
    @Query('category') category?: string,
    @Query('count') count?: string,
  ) {
    return this.channelsService.getSuggestions(
      exclude || '00000000-0000-0000-0000-000000000000',
      category || undefined,
      count ? Math.min(12, parseInt(count, 10)) : 6,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    const channel = await this.channelsService.findById(id);
    if (!channel || !channel.is_active) {
      throw new NotFoundException('Chaîne introuvable');
    }
    return {
      id: channel.id,
      name: channel.name,
      slug: channel.slug,
      category: channel.category,
      logo_url: channel.logo_url,
      is_premium: channel.is_premium,
      is_active: channel.is_active,
      sources: channel.sources.map((s) => ({
        id: s.id,
        label: s.label,
        is_premium: s.is_premium,
        sort_order: s.sort_order,
      })),
    };
  }
}
