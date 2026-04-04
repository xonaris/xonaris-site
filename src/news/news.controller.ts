import { Controller, Get, Post, Delete, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? Math.max(1, parseInt(page, 10)) : 1;
    const l = limit ? Math.min(50, Math.max(1, parseInt(limit, 10))) : 20;
    return this.newsService.findAll(userId, p, l);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', ParseUuidPipe) id: string, @CurrentUser('id') userId: string) {
    return this.newsService.findById(id, userId);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async likeNews(
    @Param('id', ParseUuidPipe) newsId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.newsService.likeNews(userId, newsId);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  async unlikeNews(
    @Param('id', ParseUuidPipe) newsId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.newsService.unlikeNews(userId, newsId);
  }
}
