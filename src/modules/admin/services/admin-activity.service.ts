import { Injectable } from '@nestjs/common';
import { AdminActivityLogRepository } from '../repositories/admin.repositories';

export interface LogActivityInput {
  adminId: string;
  action: string;
  targetResource: string;
  resourceId?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityLogFilters {
  page?: number;
  pageSize?: number;
  adminId?: string;
  action?: string;
  targetResource?: string;
}

@Injectable()
export class AdminActivityService {
  constructor(private readonly logRepo: AdminActivityLogRepository) {}

  async logActivity(input: LogActivityInput): Promise<void> {
    await this.logRepo.create({
      adminId: input.adminId,
      action: input.action,
      targetResource: input.targetResource,
      resourceId: input.resourceId ?? null,
      summary: input.summary ?? null,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null,
    });
  }

  async getActivityLog(filters: ActivityLogFilters) {
    const { page = 1, pageSize = 20, adminId, action, targetResource } = filters;

    const where: Record<string, unknown> = {};
    if (adminId) where['adminId'] = adminId;
    if (action) where['action'] = action;
    if (targetResource) where['targetResource'] = targetResource;

    const [data, total] = await Promise.all([
      this.logRepo.findMany({
        where: where as any,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.logRepo.count({ where: where as any }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
