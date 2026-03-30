import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({
      secret: (() => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret === 'CHANGE_ME_TO_A_RANDOM_64_CHAR_STRING') {
          if (process.env.NODE_ENV !== 'development') {
            throw new Error('JWT_SECRET environment variable must be set to a secure value (not placeholder)');
          }
          console.warn('⚠️  JWT_SECRET not set — using insecure default. Set JWT_SECRET for production.');
          return 'dev-secret-change-me';
        }
        return secret;
      })(),
      signOptions: { expiresIn: (process.env.JWT_EXPIRATION || '15m') as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
