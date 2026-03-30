import { Controller, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { ChannelsService } from './channels.service';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.channelsService.findAllActive();
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
