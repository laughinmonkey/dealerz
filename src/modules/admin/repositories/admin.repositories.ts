import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { AdminActivityLog } from '@prisma/client';

@Injectable()
export class AdminActivityLogRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(
    data: Prisma.AdminActivityLogUncheckedCreateInput,
  ): Promise<AdminActivityLog> {
    return await this.prisma.adminActivityLog.create({ data });
  }

  async findMany(options: {
    where?: Prisma.AdminActivityLogWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.AdminActivityLogOrderByWithRelationInput;
  }): Promise<AdminActivityLog[]> {
    return await this.prisma.adminActivityLog.findMany({
      ...options,
      include: { admin: { select: { id: true, email: true, username: true } } },
    });
  }

  async count(options: {
    where?: Prisma.AdminActivityLogWhereInput;
  }): Promise<number> {
    return await this.prisma.adminActivityLog.count(options);
  }
}
