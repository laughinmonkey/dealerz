import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/auth.decorator';
import { AdminActivityService } from '../services/admin-activity.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Admin - Activity')
@Controller('admin/activity-logs')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminActivityController {
  constructor(private readonly activityService: AdminActivityService) {}

  @Get()
  @ApiOperation({ summary: 'Get admin activity logs' })
  @ApiQuery({ name: 'adminId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'targetResource', required: false })
  async getLogs(
    @Query() pagination: PaginationDto,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
    @Query('targetResource') targetResource?: string,
  ) {
    return await this.activityService.getActivityLog({
      page: pagination.page,
      pageSize: pagination.pageSize,
      adminId,
      action,
      targetResource,
    });
  }
}
