import { Controller, Get, Post, Patch, Delete, Body, Param, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IdentityService } from '../services/identity.service';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { CreatePayoutAccountDto, UpdatePayoutAccountDto } from '../dto/payment.dto';

@ApiTags('Payout Accounts')
@Controller('users/me/payout-accounts')
@ApiBearerAuth()
export class PayoutAccountController {
  constructor(private readonly identityService: IdentityService) {}

  @Get()
  @ApiOperation({ summary: 'List my payout accounts' })
  @ApiResponse({ status: 200, description: 'Payout accounts retrieved.' })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  async list(@Req() req: AuthenticatedRequest) {
    return await this.identityService.listUserPayoutAccounts(req.user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Add a payout account' })
  @ApiResponse({ status: 201, description: 'Payout account created.' })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePayoutAccountDto,
  ) {
    return await this.identityService.createPayoutAccount(req.user.sub, dto);
  }

  @Patch(':accountId')
  @ApiOperation({ summary: 'Update a payout account' })
  @ApiResponse({ status: 200, description: 'Payout account updated.' })
  @ApiResponse({ status: 404, description: 'Payout account not found.' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('accountId') accountId: string,
    @Body() dto: UpdatePayoutAccountDto,
  ) {
    return await this.identityService.updatePayoutAccount(accountId, req.user.sub, dto);
  }

  @Delete(':accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a payout account' })
  @ApiResponse({ status: 200, description: 'Payout account deleted.' })
  @ApiResponse({ status: 404, description: 'Payout account not found.' })
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('accountId') accountId: string,
  ) {
    await this.identityService.deletePayoutAccount(accountId, req.user.sub);
    return { success: true, message: 'Payout account deleted.' };
  }
}
