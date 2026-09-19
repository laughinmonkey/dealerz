import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateNotificationDto, NotificationFiltersDto } from '../dto/notification.dto';
import { UserStatus } from '@prisma/client';
import type { Notification, NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ────────────────────────────────────────────────────

  /** Send a notification to a specific user */
  async send(userId: string, dto: CreateNotificationDto): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        metadata: dto.metadata as any,
      },
    });
  }

  /** Send a notification to multiple users (batch) */
  async sendBatch(userIds: string[], dto: CreateNotificationDto): Promise<number> {
    const data = userIds.map((userId) => ({
      userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      metadata: dto.metadata as any,
    }));
    const result = await this.prisma.notification.createMany({ data });
    return result.count;
  }

  /** Broadcast an announcement to all active users */
  async broadcast(dto: CreateNotificationDto): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, status: UserStatus.ACTIVE },
      select: { id: true },
    });
    return this.sendBatch(users.map((u) => u.id), dto);
  }

  // ─── Read ──────────────────────────────────────────────────────

  /** Get notifications for a user with optional filters */
  async getForUser(userId: string, filters: NotificationFiltersDto) {
    const { type, isRead } = filters;
    const page = Number(filters.page) || 1;
    const pageSize = Number(filters.pageSize) || 20;

    const where: any = { userId };
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /** Get a single notification by ID */
  async getById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  /** Get unread count for a user */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // ─── Update ────────────────────────────────────────────────────

  /** Mark a single notification as read */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /** Mark all notifications as read for a user */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  }

  // ─── Admin ─────────────────────────────────────────────────────

  /** Admin: list all notifications with filters */
  async getAll(filters: NotificationFiltersDto & { userId?: string }) {
    const { type, isRead, userId } = filters;
    const page = Number(filters.page) || 1;
    const pageSize = Number(filters.pageSize) || 20;

    const where: any = {};
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { id: true, username: true } } },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
