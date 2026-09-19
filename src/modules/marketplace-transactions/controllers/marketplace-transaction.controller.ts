import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/auth.decorator';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { MarketplaceTransactionService } from '../services/marketplace-transaction.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Transactions')
@Controller()
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly txService: MarketplaceTransactionService) {}

  @Post('listings/:listingId/purchase')
  @ApiOperation({ summary: 'Buy a fixed-price listing' })
  async purchase(@Req() req: AuthenticatedRequest, @Param('listingId') listingId: string) {
    return this.txService.purchaseListing(listingId, req.user.sub);
  }

  @Get('transactions')
  async list(@Req() req: AuthenticatedRequest, @Query() pagination: PaginationDto) {
    return this.txService.getTransactions({ buyerId: req.user.sub, ...pagination });
  }

  @Get('transactions/:transactionId')
  async get(@Param('transactionId') transactionId: string) {
    return this.txService.getTransaction(transactionId);
  }

  @Post('transactions/:transactionId/cancel')
  async cancel(@Param('transactionId') transactionId: string, @Body('reason') reason?: string) {
    return this.txService.cancelTransaction(transactionId, reason);
  }
}

@ApiTags('Admin - Transactions')
@Controller('admin/transactions')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminTransactionController {
  constructor(private readonly txService: MarketplaceTransactionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a marketplace transaction (admin)' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateTransactionDto) {
    return this.txService.createTransaction(dto, req.user.sub);
  }

  @Post('auctions/:listingId/complete')
  @ApiOperation({ summary: 'Settle an ended auction: select winner and create a payment-pending transaction' })
  async completeAuction(@Param('listingId') listingId: string) {
    return this.txService.completeAuction(listingId);
  }

  @Get()
  async list(@Query() pagination: PaginationDto) {
    return this.txService.getTransactions(pagination);
  }

  @Get(':transactionId')
  async get(@Param('transactionId') transactionId: string) {
    return this.txService.getTransaction(transactionId);
  }

  @Post(':transactionId/confirm-payment')
  async confirmPayment(@Req() req: AuthenticatedRequest, @Param('transactionId') id: string) {
    return this.txService.confirmPayment(id, req.user.sub);
  }

  @Post(':transactionId/transfer-asset')
  async transferAsset(@Param('transactionId') id: string) {
    return this.txService.transferAsset(id);
  }

  @Post(':transactionId/complete')
  async complete(@Param('transactionId') id: string) {
    return this.txService.completeTransaction(id);
  }

  @Post(':transactionId/cancel')
  async cancel(@Param('transactionId') id: string, @Body('reason') reason?: string) {
    return this.txService.cancelTransaction(id, reason);
  }

  @Post(':transactionId/mark-failed')
  @ApiOperation({ summary: 'Mark a transaction as failed' })
  async markFailed(
    @Param('transactionId') id: string,
    @Body('reason') reason: string,
  ) {
    return this.txService.markFailed(id, reason);
  }

  @Post(':transactionId/open-dispute')
  @ApiOperation({ summary: 'Open a dispute on a transaction' })
  async openDispute(
    @Param('transactionId') id: string,
    @Body('reason') reason: string,
  ) {
    return this.txService.openDispute(id, reason);
  }
}
