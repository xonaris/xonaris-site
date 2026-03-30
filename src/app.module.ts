import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChannelsModule } from './channels/channels.module';
import { StreamModule } from './stream/stream.module';
import { PremiumModule } from './premium/premium.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ReportsModule } from './reports/reports.module';
import { NewsModule } from './news/news.module';
import { AdminModule } from './admin/admin.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { AdsModule } from './ads/ads.module';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import { EncryptionInterceptor } from './common/interceptors/encryption.interceptor';
import { SanitizeMiddleware } from './common/middleware/sanitize.middleware';

@Module({
  imports: [
    // Rate limiting global — different tiers
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 second
        limit: 5,     // 5 requests/second burst
      },
      {
        name: 'medium',
        ttl: 60000,  // 1 minute
        limit: 60,   // 60 requests/minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 600,    // 600 requests/hour
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ChannelsModule,
    StreamModule,
    PremiumModule,
    FavoritesModule,
    ReportsModule,
    NewsModule,
    AdminModule,
    AdsModule,
    MaintenanceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: EncryptionInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SanitizeMiddleware).forRoutes('*');
  }
}
