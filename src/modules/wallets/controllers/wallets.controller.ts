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
import { WalletService } from '../services/wallet.service';
import { WalletTransactionService } from '../services/wallet-transaction.service';
import { BalanceAdjustDto, LedgerFiltersDto, WalletFiltersDto } from '../dto/wallet.dto';
import { Currency } from '@prisma/client';

// ─── Public / User endpoints ─────────────────────────────────────

@ApiTags('Wallet')
@Controller()
@ApiBearerAuth()
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly txService: WalletTransactionService,
  ) {}

  @Get('wallets')
  @ApiOperation({ summary: 'List my wallets (one per currency)' })
  async list(@Req() req: AuthenticatedRequest) {
    return this.walletService.getWallets(req.user.sub);
  }

  @Get('wallets/:currency')
  @ApiOperation({ summary: 'Get my wallet for a specific currency' })
  async get(
    @Req() req: AuthenticatedRequest,
    @Param('currency') currency: string,
  ) {
    return this.walletService.getWallet(req.user.sub, currency as any);
  }

  @Get('wallets/:currencyOrId/transactions')
  @ApiOperation({ summary: 'Get immutable ledger entries for a wallet (by currency or wallet ID)' })
  async transactions(
    @Req() req: AuthenticatedRequest,
    @Param('currencyOrId') currencyOrId: string,
    @Query() filters: LedgerFiltersDto,
  ) {
    // If it looks like a UUID, treat it as wallet ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(currencyOrId)) {
      return this.txService.getTransactions(currencyOrId, filters);
    }
    // Otherwise treat as currency
    const wallet = await this.walletService.getWallet(
      req.user.sub,
      currencyOrId as any,
    );
    return this.txService.getTransactions(wallet.id, filters);
  }
}

// ─── Admin endpoints ─────────────────────────────────────────────

@ApiTags('Admin - Wallets')
@Controller('admin')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminWalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly txService: WalletTransactionService,
  ) {}

  @Get('wallets')
  @ApiOperation({ summary: 'List all wallets (admin scoped)' })
  async listAll(@Query() filters: WalletFiltersDto) {
    return this.walletService.getAllWallets({
      userId: filters.userId,
      currency: filters.currency as Currency | undefined,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  }

  @Get('wallets/:walletId')
  @ApiOperation({ summary: 'Get a wallet by ID (admin)' })
  async getWallet(@Param('walletId') walletId: string) {
    return this.walletService.getWalletById(walletId);
  }

  @Get('wallets/:walletId/transactions')
  @ApiOperation({ summary: 'Get ledger entries for a wallet (admin)' })
  async getWalletTransactions(
    @Param('walletId') walletId: string,
    @Query() filters: LedgerFiltersDto,
  ) {
    return this.txService.getTransactions(walletId, filters);
  }

  @Get('users/:userId/wallets')
  @ApiOperation({ summary: "List a specific user's wallets" })
  async listUserWallets(@Param('userId') userId: string) {
    return this.walletService.getWallets(userId);
  }

  @Post('users/:userId/wallets')
  @ApiOperation({ summary: 'Provision wallets for a user (all supported currencies)' })
  async createWallets(@Param('userId') userId: string) {
    await this.walletService.createWalletsForUser(userId);
    return this.walletService.getWallets(userId);
  }

  @Get('users/:userId/wallets/:currency')
  @ApiOperation({ summary: "Get a specific user's wallet by currency" })
  async getUserWallet(
    @Param('userId') userId: string,
    @Param('currency') currency: string,
  ) {
    return this.walletService.getWallet(userId, currency as any);
  }

  @Get('users/:userId/wallets/:currency/transactions')
  @ApiOperation({ summary: "Get a specific user's ledger entries" })
  async getUserWalletTransactions(
    @Param('userId') userId: string,
    @Param('currency') currency: string,
    @Query() filters: LedgerFiltersDto,
  ) {
    const wallet = await this.walletService.getWallet(
      userId,
      currency as any,
    );
    return this.txService.getTransactions(wallet.id, filters);
  }

  @Post('wallets/:walletId/adjust')
  @ApiOperation({ summary: 'Adjust wallet balance (admin only)' })
  async adjustBalance(
    @Req() req: AuthenticatedRequest,
    @Param('walletId') walletId: string,
    @Body() dto: BalanceAdjustDto,
  ) {
    return this.walletService.adjustBalance(
      walletId,
      req.user.sub,
      dto.amount,
      dto.reason,
    );
  }

  @Post('wallets/:walletId/credit')
  @ApiOperation({ summary: 'Credit a wallet (admin only)' })
  async credit(
    @Req() req: AuthenticatedRequest,
    @Param('walletId') walletId: string,
    @Body() dto: { amount: number; reference?: string },
  ) {
    return this.walletService.credit(
      walletId,
      dto.amount,
      {
        type: 'ADMIN',
        id: null as unknown as string,
      },
    );
  }

  @Post('wallets/:walletId/debit')
  @ApiOperation({ summary: 'Debit a wallet (admin only)' })
  async debit(
    @Req() req: AuthenticatedRequest,
    @Param('walletId') walletId: string,
    @Body() dto: { amount: number; reference?: string },
  ) {
    return this.walletService.debit(
      walletId,
      dto.amount,
      {
        type: 'ADMIN',
        id: null as unknown as string,
      },
    );
  }
}
