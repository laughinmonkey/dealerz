import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminActivityController } from './controllers/admin-activity.controller';
import { AdminSettingsController, PublicConfigController } from './controllers/admin-settings.controller';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminActivityService } from './services/admin-activity.service';
import { AdminActivityLogRepository } from './repositories/admin.repositories';

@Module({
  imports: [PrismaModule],
  controllers: [AdminDashboardController, AdminActivityController, AdminSettingsController, PublicConfigController],
  providers: [
    AdminDashboardService,
    AdminActivityService,
    AdminActivityLogRepository,
  ],
  exports: [AdminDashboardService, AdminActivityService],
})
export class AdminModule {}
