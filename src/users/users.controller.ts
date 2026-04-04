import { Controller, Get, Patch, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    const updatedUser = await this.usersService.checkPremiumStatus(user.id);
    return this.usersService.getPublicProfile(updatedUser || user);
  }

  @Patch('me/sync-discord')
  @UseGuards(JwtAuthGuard)
  async syncDiscord(@CurrentUser() user: any, @Req() req: Request) {
    const token = req.cookies?.['xonaris_token'];
    return this.usersService.syncDiscord(user.id, user.discord_id, token);
  }
}
