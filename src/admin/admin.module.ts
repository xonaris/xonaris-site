import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';

@Module({
  imports: [AuthModule, MaintenanceModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
