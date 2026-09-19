import { Module } from '@nestjs/common';
import { NotificationController, AdminNotificationController } from './controllers/notification.controller';
import { NotificationService } from './services/notification.service';

@Module({
  controllers: [NotificationController, AdminNotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
