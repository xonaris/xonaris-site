import { Module } from '@nestjs/common';
import { PremiumController } from './premium.controller';
import { PremiumService } from './premium.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PremiumController],
  providers: [PremiumService],
  exports: [PremiumService],
})
export class PremiumModule {}
