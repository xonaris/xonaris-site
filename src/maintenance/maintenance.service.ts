import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus() {
    let maintenance = await this.prisma.maintenance.findUnique({
      where: { id: 'singleton' },
    });

    if (!maintenance) {
      maintenance = await this.prisma.maintenance.create({
        data: { id: 'singleton', active: false },
      });
    }

    return { active: maintenance.active, reason: maintenance.reason };
  }

  async toggle(active: boolean, reason?: string) {
    const maintenance = await this.prisma.maintenance.upsert({
      where: { id: 'singleton' },
      update: { active, reason: reason || null },
      create: { id: 'singleton', active, reason: reason || null },
    });

    return { active: maintenance.active, reason: maintenance.reason };
  }
}
