import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateReportDto) {
    return this.reportsService.create(userId, dto.channel_id, dto.reason);
  }

  @Get('mine')
  async findAll(@CurrentUser('id') userId: string) {
    return this.reportsService.findAllByUser(userId);
  }
}
