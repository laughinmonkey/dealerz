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
import { DepositService } from '../services/deposit.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateDepositDto,
  DepositFiltersDto,
  RejectDto,
} from '../dto/wallet.dto';

// ─── Public / User endpoints ─────────────────────────────────────

@ApiTags('Deposits')
@Controller()
@ApiBearerAuth()
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  @Get('deposits')
  @ApiOperation({ summary: 'List my deposits' })
  async listDeposits(
    @Req() req: AuthenticatedRequest,
    @Query() filters: DepositFiltersDto,
  ) {
    return this.depositService.getDeposits({
      ...filters,
      userId: req.user.sub,
    });
  }

  @Post('deposits')
  @ApiOperation({ summary: 'Submit a deposit request' })
  async createDeposit(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateDepositDto,
  ) {
    return this.depositService.createDeposit(req.user.sub, dto);
  }

  @Get('deposits/:depositId')
  @ApiOperation({ summary: 'Get a deposit by ID' })
  async getDeposit(@Param('depositId') depositId: string) {
    return this.depositService.getDeposit(depositId);
  }
}

// ─── Admin endpoints ─────────────────────────────────────────────

@ApiTags('Admin - Deposits')
@Controller('admin')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminDepositController {
  constructor(
    private readonly depositService: DepositService,
    private readonly prisma: PrismaService,
  ) {}

  private async log(adminId: string, action: string, resource: string, resourceId: string, summary: string) {
    await this.prisma.adminActivityLog.create({
      data: { adminId, action, targetResource: resource, resourceId, summary },
    }).catch(() => {});
  }

  @Get('deposits')
  @ApiOperation({ summary: 'List all deposits (admin)' })
  async listAll(@Query() filters: DepositFiltersDto) {
    return this.depositService.getDeposits(filters);
  }

  @Get('deposits/:depositId')
  @ApiOperation({ summary: 'Get a deposit by ID (admin)' })
  async getDeposit(@Param('depositId') depositId: string) {
    return this.depositService.getDeposit(depositId);
  }

  @Post('deposits/:depositId/approve')
  @ApiOperation({ summary: 'Approve a pending deposit' })
  async approveDeposit(
    @Req() req: AuthenticatedRequest,
    @Param('depositId') depositId: string,
  ) {
    const result = await this.depositService.approveDeposit(depositId, req.user.sub);
    await this.log(req.user.sub, 'APPROVE_DEPOSIT', 'deposit', depositId, `Approved deposit ${depositId}`);
    return result;
  }

  @Post('deposits/:depositId/reject')
  @ApiOperation({ summary: 'Reject a pending deposit' })
  async rejectDeposit(
    @Req() req: AuthenticatedRequest,
    @Param('depositId') depositId: string,
    @Body() dto: RejectDto,
  ) {
    const result = await this.depositService.rejectDeposit(depositId, req.user.sub, dto.reason);
    await this.log(req.user.sub, 'REJECT_DEPOSIT', 'deposit', depositId, `Rejected deposit ${depositId}: ${dto.reason}`);
    return result;
  }

  @Post('users/:userId/deposits')
  @ApiOperation({ summary: 'Create a deposit on behalf of a user' })
  async createDeposit(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: CreateDepositDto,
  ) {
    const result = await this.depositService.createDeposit(userId, dto);
    await this.log(req.user?.sub ?? 'system', 'CREATE_DEPOSIT', 'deposit', (result as any).id, `Created deposit for user ${userId}`);
    return result;
  }
}
