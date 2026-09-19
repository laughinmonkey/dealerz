import { Module } from '@nestjs/common';
import { WalletController, AdminWalletController } from './controllers/wallets.controller';
import { DepositController, AdminDepositController } from './controllers/deposits.controller';
import { WithdrawalController, AdminWithdrawalController } from './controllers/withdrawals.controller';
import { WalletService } from './services/wallet.service';
import { DepositService } from './services/deposit.service';
import { WithdrawalService } from './services/withdrawal.service';
import { WalletTransactionService } from './services/wallet-transaction.service';
import {
  WalletRepository,
  WalletTransactionRepository,
  DepositRepository,
  WithdrawalRepository,
} from './repositories/wallet.repositories';

@Module({
  controllers: [
    WalletController,
    AdminWalletController,
    DepositController,
    AdminDepositController,
    WithdrawalController,
    AdminWithdrawalController,
  ],
  providers: [
    WalletService,
    DepositService,
    WithdrawalService,
    WalletTransactionService,
    WalletRepository,
    WalletTransactionRepository,
    DepositRepository,
    WithdrawalRepository,
  ],
  exports: [
    WalletService,
    DepositService,
    WithdrawalService,
    WalletTransactionService,
  ],
})
export class WalletsModule {}
