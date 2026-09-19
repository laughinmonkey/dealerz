import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/auth.decorator';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto, NotificationFiltersDto, MarkReadDto } from '../dto/notification.dto';

// ─── User Endpoints ──────────────────────────────────────────────

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List my notifications' })
  async list(
    @Req() req: AuthenticatedRequest,
    @Query() filters: NotificationFiltersDto,
  ) {
    return this.notificationService.getForUser(req.user.sub, filters);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(@Req() req: AuthenticatedRequest) {
    const count = await this.notificationService.getUnreadCount(req.user.sub);
    return { count };
  }

  @Get(':notificationId')
  @ApiOperation({ summary: 'Get a single notification' })
  async get(
    @Req() req: AuthenticatedRequest,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationService.getById(notificationId);
  }

  @Patch(':notificationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(
    @Req() req: AuthenticatedRequest,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationService.markAsRead(notificationId, req.user.sub);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@Req() req: AuthenticatedRequest) {
    const count = await this.notificationService.markAllAsRead(req.user.sub);
    return { markedRead: count };
  }
}

// ─── Admin Endpoints ─────────────────────────────────────────────

@ApiTags('Admin - Notifications')
@Controller('admin/notifications')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List all notifications (admin)' })
  async listAll(@Query() filters: NotificationFiltersDto & { userId?: string }) {
    return this.notificationService.getAll(filters);
  }

  @Get(':notificationId')
  @ApiOperation({ summary: 'Get a notification by ID (admin)' })
  async get(@Param('notificationId') notificationId: string) {
    return this.notificationService.getById(notificationId);
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast an announcement to all active users' })
  async broadcast(@Body() dto: CreateNotificationDto) {
    const count = await this.notificationService.broadcast(dto);
    return {
      success: true,
      message: `Announcement sent to ${count} users.`,
      count,
    };
  }

  @Post('user/:userId')
  @ApiOperation({ summary: 'Send a notification directly to a specific user' })
  async sendToUser(
    @Param('userId') userId: string,
    @Body() dto: CreateNotificationDto,
  ) {
    const notification = await this.notificationService.send(userId, dto);
    return {
      success: true,
      message: 'Notification sent.',
      data: notification,
    };
  }
}
