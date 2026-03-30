import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PremiumService } from './premium.service';
import { RedeemCodeDto } from './dto/redeem-code.dto';

@Controller('premium')
export class PremiumController {
  constructor(private readonly premiumService: PremiumService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@CurrentUser('id') userId: string) {
    return this.premiumService.getStatus(userId);
  }

  @Post('redeem')
  @UseGuards(JwtAuthGuard)
  @Throttle({ medium: { limit: 5, ttl: 60000 } }) // max 5 tentatives/minute par IP
  async redeemCode(@CurrentUser('id') userId: string, @Body() dto: RedeemCodeDto) {
    return this.premiumService.redeemCode(userId, dto.code);
  }
}
