import { Injectable, CanActivate, ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Skip maintenance check for admin routes
    if (request.url?.startsWith('/admin')) return true;
    // Skip for auth routes
    if (request.url?.startsWith('/auth')) return true;
    // Skip for maintenance status route
    if (request.url === '/maintenance/status') return true;
    // Skip for stream token verification (nginx subrequest)
    if (request.url === '/stream/verify') return true;

    const maintenance = await this.prisma.maintenance.findUnique({
      where: { id: 'singleton' },
    });

    if (maintenance?.active) {
      // Try to identify admin from JWT cookie (JwtAuthGuard may not have run yet)
      try {
        const token = request.cookies?.['xonaris_token'];
        if (token) {
          const payload = this.jwtService.verify(token);
          const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { role: true },
          });
          if (user?.role === 'ADMIN') return true;
        }
      } catch {
        // Token invalid or expired — treat as non-admin
      }

      throw new ServiceUnavailableException({
        message: 'Plateforme en maintenance',
        reason: maintenance.reason || 'Maintenance en cours',
      });
    }

    return true;
  }
}
