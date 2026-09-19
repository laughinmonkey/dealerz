import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/auth.decorator';
import { AdminDashboardService } from '../services/admin-dashboard.service';

@ApiTags('Admin - Dashboard')
@Controller('admin')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard metrics' })
  async getDashboard() {
    return this.dashboardService.getDashboard();
  }
}
