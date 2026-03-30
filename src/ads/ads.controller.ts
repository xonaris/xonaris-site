import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdsService } from './ads.service';
import { GetAdDto, ValidateAdDto } from './dto/ads.dto';

@Controller('ads')
@UseGuards(JwtAuthGuard)
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  /**
   * GET /ads/get — user clicks "watch ad" → backend returns the ad link.
   * Only non-premium users may call this.
   * Rate-limited: 3 calls / 60 s.
   */
  @Post('get')
  @Throttle({ medium: { ttl: 60000, limit: 3 } })
  async getAd(
    @CurrentUser() user: any,
    @Body() dto: GetAdDto,
  ) {
    if (user.is_premium) {
      throw new ForbiddenException('Les utilisateurs premium n\'ont pas besoin de publicité');
    }
    return this.adsService.getAd(user.id, dto.channel_id);
  }

  /**
   * POST /ads/validate — user comes back from ad page  → backend gives a proof token.
   * Rate-limited: 3 calls / 60 s.
   * Logs an AD_VIEW action.
   */
  @Post('validate')
  @Throttle({ medium: { ttl: 60000, limit: 3 } })
  async validateAd(
    @CurrentUser() user: any,
    @Body() dto: ValidateAdDto,
  ) {
    if (user.is_premium) {
      throw new ForbiddenException('Les utilisateurs premium n\'ont pas besoin de publicité');
    }
    return this.adsService.generateAdProof(user.id, dto.channel_id, dto.nonce);
  }
}
