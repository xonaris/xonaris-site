import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import {
  CreateChannelDto,
  UpdateChannelDto,
  CreateChannelSourceDto,
  UpdateChannelSourceDto,
  GeneratePremiumCodesDto,
  UpdateReportDto,
  BanUserDto,
  MaintenanceDto,
  CreateNewsDto,
  UpdateNewsDto,
  UpdateSettingDto,
  CreateAdDto,
  UpdateAdDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  // ── STATS ──────────────────────────────────

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('stats/history')
  async getStatsHistory(@Query('days') days?: string) {
    return this.adminService.getStatsHistory(days ? parseInt(days) : 30);
  }

  // ── USERS ──────────────────────────────────

  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      search || undefined,
    );
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Patch('users/:id/ban')
  async banUser(@Param('id') id: string, @Body() dto: BanUserDto) {
    return this.adminService.banUser(id, dto);
  }

  @Patch('users/:id/unban')
  async unbanUser(@Param('id') id: string) {
    return this.adminService.unbanUser(id);
  }

  @Get('bans')
  async getBannedUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getBannedUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  // ── CHANNELS ───────────────────────────────

  @Get('channels')
  async getChannels() {
    return this.adminService.getAllChannels();
  }

  @Get('channels/:id')
  async getChannelById(@Param('id') id: string) {
    return this.adminService.getChannelById(id);
  }

  @Post('channels')
  async createChannel(@Body() dto: CreateChannelDto) {
    return this.adminService.createChannel(dto);
  }

  @Put('channels/:id')
  async updateChannel(@Param('id') id: string, @Body() dto: UpdateChannelDto) {
    return this.adminService.updateChannel(id, dto);
  }

  @Delete('channels/:id')
  async deleteChannel(@Param('id') id: string) {
    return this.adminService.deleteChannel(id);
  }

  // ── CHANNEL SOURCES ────────────────────────

  @Get('channels/:id/sources')
  async getChannelSources(@Param('id') channelId: string) {
    return this.adminService.getChannelSources(channelId);
  }

  @Post('channels/:id/sources')
  async createChannelSource(@Param('id') channelId: string, @Body() dto: CreateChannelSourceDto) {
    return this.adminService.createChannelSource(channelId, dto);
  }

  @Put('channels/:channelId/sources/:sourceId')
  async updateChannelSource(
    @Param('channelId') channelId: string,
    @Param('sourceId') sourceId: string,
    @Body() dto: UpdateChannelSourceDto,
  ) {
    return this.adminService.updateChannelSource(channelId, sourceId, dto);
  }

  @Delete('channels/:channelId/sources/:sourceId')
  async deleteChannelSource(
    @Param('channelId') channelId: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.adminService.deleteChannelSource(channelId, sourceId);
  }

  // ── PREMIUM CODES ─────────────────────────

  @Post('premium-codes')
  async generatePremiumCodes(@Body() dto: GeneratePremiumCodesDto) {
    return this.adminService.generatePremiumCodes(dto);
  }

  @Get('premium-codes')
  async getPremiumCodes(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllPremiumCodes(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Delete('premium-codes/:id')
  async deletePremiumCode(@Param('id') id: string) {
    return this.adminService.deletePremiumCode(id);
  }

  // ── REPORTS ────────────────────────────────

  @Get('reports')
  async getReports(@Query('status') status?: string) {
    const valid = ['PENDING', 'ACCEPTED', 'REFUSED'];
    const reportStatus =
      status && valid.includes(status.toUpperCase())
        ? (status.toUpperCase() as any)
        : undefined;
    return this.adminService.getAllReports(reportStatus);
  }

  @Patch('reports/:id')
  async updateReport(@Param('id') id: string, @Body() dto: UpdateReportDto) {
    return this.adminService.updateReport(id, dto.status, dto.admin_response);
  }

  // ── NEWS ───────────────────────────────────

  @Get('news')
  async getNews() {
    return this.adminService.getAllNews();
  }

  @Get('news/:id')
  async getNewsById(@Param('id') id: string) {
    return this.adminService.getNewsById(id);
  }

  @Post('news')
  async createNews(@Body() dto: CreateNewsDto) {
    return this.adminService.createNews(dto);
  }

  @Put('news/:id')
  async updateNews(@Param('id') id: string, @Body() dto: UpdateNewsDto) {
    return this.adminService.updateNews(id, dto);
  }

  @Delete('news/:id')
  async deleteNews(@Param('id') id: string) {
    return this.adminService.deleteNews(id);
  }

  // ── SETTINGS ───────────────────────────────

  @Get('settings')
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings/:key')
  async updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    return this.adminService.updateSetting(key, dto.value);
  }

  // ── ADS ─────────────────────────────────────

  @Get('ads')
  async getAds() {
    return this.adminService.getAllAds();
  }

  @Post('ads')
  async createAd(@Body() dto: CreateAdDto) {
    return this.adminService.createAd(dto);
  }

  @Put('ads/:id')
  async updateAd(@Param('id') id: string, @Body() dto: UpdateAdDto) {
    return this.adminService.updateAd(id, dto);
  }

  @Delete('ads/:id')
  async deleteAd(@Param('id') id: string) {
    return this.adminService.deleteAd(id);
  }

  // ── MAINTENANCE ────────────────────────────

  @Get('maintenance')
  async getMaintenanceStatus() {
    return this.maintenanceService.getStatus();
  }

  @Patch('maintenance')
  async toggleMaintenance(@Body() dto: MaintenanceDto) {
    return this.maintenanceService.toggle(dto.active, dto.reason);
  }
}
