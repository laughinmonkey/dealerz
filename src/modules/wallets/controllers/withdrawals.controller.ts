import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/auth.decorator';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { WithdrawalService } from '../services/withdrawal.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateWithdrawalDto,
  WithdrawalFiltersDto,
  RejectDto,
} from '../dto/wallet.dto';

// ─── Public / User endpoints ─────────────────────────────────────

@ApiTags('Withdrawals')
@Controller()
@ApiBearerAuth()
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Get('withdrawals')
  @ApiOperation({ summary: 'List my withdrawals' })
  async listWithdrawals(
    @Req() req: AuthenticatedRequest,
    @Query() filters: WithdrawalFiltersDto,
  ) {
    return this.withdrawalService.getWithdrawals({
      ...filters,
      userId: req.user.sub,
    });
  }

  @Post('withdrawals')
  @ApiOperation({ summary: 'Submit a withdrawal request' })
  async createWithdrawal(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.withdrawalService.createWithdrawal(req.user.sub, dto);
  }

  @Get('withdrawals/:withdrawalId')
  @ApiOperation({ summary: 'Get a withdrawal by ID' })
  async getWithdrawal(@Param('withdrawalId') withdrawalId: string) {
    return this.withdrawalService.getWithdrawal(withdrawalId);
  }
}

// ─── Admin endpoints ─────────────────────────────────────────────

@ApiTags('Admin - Withdrawals')
@Controller('admin')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminWithdrawalController {
  constructor(
    private readonly withdrawalService: WithdrawalService,
    private readonly prisma: PrismaService,
  ) {}

  private async log(adminId: string, action: string, resource: string, resourceId: string, summary: string) {
    await this.prisma.adminActivityLog.create({
      data: { adminId, action, targetResource: resource, resourceId, summary },
    }).catch(() => {});
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'List all withdrawals (admin)' })
  async listAll(@Query() filters: WithdrawalFiltersDto) {
    return this.withdrawalService.getWithdrawals(filters);
  }

  @Get('withdrawals/:withdrawalId')
  @ApiOperation({ summary: 'Get a withdrawal by ID (admin)' })
  async getWithdrawal(@Param('withdrawalId') withdrawalId: string) {
    return this.withdrawalService.getWithdrawal(withdrawalId);
  }

  @Post('withdrawals/:withdrawalId/approve')
  @ApiOperation({ summary: 'Approve a pending withdrawal' })
  async approveWithdrawal(
    @Req() req: AuthenticatedRequest,
    @Param('withdrawalId') withdrawalId: string,
  ) {
    const result = await this.withdrawalService.approveWithdrawal(withdrawalId, req.user.sub);
    await this.log(req.user.sub, 'APPROVE_WITHDRAWAL', 'withdrawal', withdrawalId, `Approved withdrawal ${withdrawalId}`);
    return result;
  }

  @Post('withdrawals/:withdrawalId/reject')
  @ApiOperation({ summary: 'Reject a pending withdrawal' })
  async rejectWithdrawal(
    @Req() req: AuthenticatedRequest,
    @Param('withdrawalId') withdrawalId: string,
    @Body() dto: RejectDto,
  ) {
    const result = await this.withdrawalService.rejectWithdrawal(withdrawalId, req.user.sub, dto.reason);
    await this.log(req.user.sub, 'REJECT_WITHDRAWAL', 'withdrawal', withdrawalId, `Rejected withdrawal ${withdrawalId}: ${dto.reason}`);
    return result;
  }

  @Post('users/:userId/withdrawals')
  @ApiOperation({ summary: 'Create a withdrawal on behalf of a user' })
  async createWithdrawal(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: CreateWithdrawalDto,
  ) {
    const result = await this.withdrawalService.createWithdrawal(userId, dto);
    await this.log(req.user?.sub ?? 'system', 'CREATE_WITHDRAWAL', 'withdrawal', (result as any).id, `Created withdrawal for user ${userId}`);
    return result;
  }
}
