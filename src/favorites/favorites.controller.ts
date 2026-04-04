import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.favoritesService.findAllByUser(userId);
  }

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateFavoriteDto) {
    return this.favoritesService.create(userId, dto.channel_id);
  }

  @Delete(':id')
  async delete(@CurrentUser('id') userId: string, @Param('id', ParseUuidPipe) id: string) {
    return this.favoritesService.delete(userId, id);
  }
}
