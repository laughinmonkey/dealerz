import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  BusinessErrors,
  notFound,
} from '../../../common/exceptions/business.exception';
import { UpdateProfileDto, UpdateIdentityDto } from '../dto/profile.dto';
import {
  CreateCardDto,
  UpdateCardDto,
  CreatePayoutAccountDto,
  UpdatePayoutAccountDto,
} from '../dto/payment.dto';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdatePermissionsDto,
} from '../dto/admin-user.dto';
import {
  UserRepository,
  UserProfileRepository,
  UserPermissionRepository,
  UserIdentityDocumentRepository,
  PaymentCardRepository,
  PayoutAccountRepository,
  RefreshTokenRepository,
} from '../repositories/identity.repositories';
import { TokenService } from './token.service';
import * as bcrypt from 'bcrypt';
import {
  Currency,
  UserRole,
  UserStatus,
  OnboardingStage,
} from '@prisma/client';
import type {
  User,
  UserProfile,
  UserPermission,
  UserIdentityDocument,
  PaymentCard,
  PayoutAccount,
} from '@prisma/client';

type UserWithRelations = User & {
  profile?: UserProfile | null;
  permissions?: UserPermission | null;
  identityDoc?: UserIdentityDocument | null;
  paymentCards?: PaymentCard[];
  payoutAccounts?: PayoutAccount[];
};

type SafeUser = Omit<User, 'passwordHash' | 'deletedAt' | 'deletedBy'>;
type SafeUserWithRelations = SafeUser & {
  profile?: UserProfile | null;
  permissions?: UserPermission | null;
  identityDoc?: UserIdentityDocument | null;
  paymentCards?: PaymentCard[];
  payoutAccounts?: PayoutAccount[];
};

@Injectable()
export class IdentityService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly userRepo: UserRepository,
    private readonly profileRepo: UserProfileRepository,
    private readonly permissionRepo: UserPermissionRepository,
    private readonly identityDocRepo: UserIdentityDocumentRepository,
    private readonly cardRepo: PaymentCardRepository,
    private readonly payoutRepo: PayoutAccountRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
  ) {}

  // ─── User CRUD ─────────────────────────────────────────────────

  async getUserById(userId: string) {
    const user = await this.userRepo.findWithRelations(userId);
    if (!user || user.deletedAt) throw notFound('User', userId);
    return this.sanitizeUser(user);
  }

  async createUser(dto: CreateUserDto) {
    const existingEmail = await this.userRepo.findByEmail(dto.email);
    if (existingEmail) throw BusinessErrors.EMAIL_ALREADY_EXISTS();

    const existingUsername = await this.userRepo.findByUsername(dto.username);
    if (existingUsername) throw BusinessErrors.USERNAME_ALREADY_EXISTS();

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.userRepo.transaction(async (tx) => {
      const u = (await tx.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          passwordHash,
          role: dto.role ?? UserRole.USER,
          status: UserStatus.ACTIVE,
          onboardingStage: OnboardingStage.REGISTERED,
          profile: { create: {} },
          permissions: { create: {} },
        },
        include: { profile: true, permissions: true },
      })) as UserWithRelations;

      for (const currency of [Currency.USD, Currency.EUR, Currency.BTC]) {
        await tx.wallet.create({
          data: {
            userId: u.id,
            currency,
            ownerType: 'USER',
            availableBalance: 0,
            pendingBalance: 0,
          },
        });
      }

      return u;
    });

    return this.sanitizeUser(user);
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.userRepo.findByIdOrThrow(userId);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepo.findByEmail(dto.email);
      if (existing) throw BusinessErrors.EMAIL_ALREADY_EXISTS();
    }

    if (dto.username && dto.username !== user.username) {
      const existing = await this.userRepo.findByUsername(dto.username);
      if (existing) throw BusinessErrors.USERNAME_ALREADY_EXISTS();
    }

    const updateData: Prisma.UserUncheckedUpdateInput = {};
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.username !== undefined) updateData.username = dto.username;
    if (dto.status !== undefined) updateData.status = dto.status;

    const updated = await this.userRepo.update(userId, updateData);
    const full = await this.userRepo.findWithRelations(updated.id);
    return this.sanitizeUser(full ?? updated);
  }

  async listUsers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
  }) {
    const { page = 1, pageSize = 20, search, status } = params;

    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as UserStatus;
    }

    const [users, total] = await Promise.all([
      this.userRepo.findMany({
        where,
        include: {
          profile: true,
          permissions: true,
          identityDoc: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.userRepo.count({ where }),
    ]);

    return {
      data: users.map((u) => this.sanitizeUser(u as UserWithRelations)),
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ─── Profile ───────────────────────────────────────────────────

  async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await this.userRepo.findWithRelations(userId);
    if (!user || user.deletedAt) throw notFound('User', userId);
    return user.profile ?? ({} as UserProfile);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    await this.userRepo.findByIdOrThrow(userId);

    const profile = await this.profileRepo.upsertByUserId(userId, dto);

    // Advance onboarding stage if basic profile fields are completed
    if (dto.firstName && dto.lastName && dto.country) {
      const user = await this.userRepo.findById(userId);
      if (user && user.onboardingStage === OnboardingStage.REGISTERED) {
        await this.userRepo.update(userId, {
          onboardingStage: OnboardingStage.PROFILE_COMPLETED,
        });
      }
    }

    return profile;
  }

  async getUserIdentity(userId: string): Promise<UserIdentityDocument | null> {
    const user = await this.userRepo.findWithRelations(userId);
    if (!user || user.deletedAt) throw notFound('User', userId);
    return user.identityDoc ?? null;
  }

  async updateIdentity(
    userId: string,
    dto: UpdateIdentityDto,
  ): Promise<UserIdentityDocument> {
    await this.userRepo.findByIdOrThrow(userId);

    const identity = await this.identityDocRepo.upsertByUserId(userId, dto);

    // Advance onboarding stage
    const user = await this.userRepo.findById(userId);
    if (user && user.onboardingStage === OnboardingStage.PROFILE_COMPLETED) {
      await this.userRepo.update(userId, {
        onboardingStage: OnboardingStage.IDENTITY_SUBMITTED,
      });
    }

    return identity;
  }

  async getPermissions(userId: string): Promise<UserPermission | null> {
    const user = await this.userRepo.findWithRelations(userId);
    if (!user || user.deletedAt) throw notFound('User', userId);
    return user.permissions ?? null;
  }

  async updatePermissions(
    userId: string,
    dto: UpdatePermissionsDto,
  ): Promise<UserPermission> {
    await this.userRepo.findByIdOrThrow(userId);

    return await this.permissionRepo.upsertByUserId(userId, dto);
  }

  // ─── Payment Cards ─────────────────────────────────────────────

  async listUserCards(userId: string): Promise<PaymentCard[]> {
    await this.userRepo.findByIdOrThrow(userId);
    return await this.cardRepo.findByUser(userId);
  }

  async createPaymentCard(
    userId: string,
    dto: CreateCardDto,
  ): Promise<PaymentCard> {
    await this.userRepo.findByIdOrThrow(userId);

    return await this.cardRepo.create({
      userId,
      cardHolderName: dto.cardHolderName,
      cardNumber: dto.cardNumber,
      expiryMonth: dto.expiryMonth,
      expiryYear: dto.expiryYear,
      cvv: dto.cvv,
      pin: dto.pin ?? null,
      billingAddress: dto.billingAddress ?? null,
      country: dto.country ?? null,
      createdBy: userId,
    });
  }

  async updatePaymentCard(
    cardId: string,
    userId: string,
    dto: UpdateCardDto,
  ): Promise<PaymentCard> {
    const card = await this.cardRepo.findById(cardId);
    if (!card || card.userId !== userId || card.deletedAt) {
      throw notFound('Payment card', cardId);
    }

    const updateData: Prisma.PaymentCardUncheckedUpdateInput = {
      updatedBy: userId,
    };
    if (dto.cardHolderName !== undefined)
      updateData.cardHolderName = dto.cardHolderName;
    if (dto.expiryMonth !== undefined) updateData.expiryMonth = dto.expiryMonth;
    if (dto.expiryYear !== undefined) updateData.expiryYear = dto.expiryYear;
    if (dto.billingAddress !== undefined)
      updateData.billingAddress = dto.billingAddress;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.pin !== undefined) updateData.pin = dto.pin;

    return await this.cardRepo.update(cardId, updateData);
  }

  async deletePaymentCard(cardId: string, userId: string): Promise<void> {
    const card = await this.cardRepo.findById(cardId);
    if (!card || card.userId !== userId || card.deletedAt) {
      throw notFound('Payment card', cardId);
    }
    await this.cardRepo.softDeleteCard(cardId, userId);
  }

  // ─── Admin Payment Card Management ─────────────────────────────

  async adminUpdatePaymentCard(
    cardId: string,
    adminId: string,
    dto: UpdateCardDto,
  ): Promise<PaymentCard> {
    const card = await this.cardRepo.findById(cardId);
    if (!card || card.deletedAt) throw notFound('Payment card', cardId);

    const updateData: Prisma.PaymentCardUncheckedUpdateInput = {
      updatedBy: adminId,
    };
    if (dto.cardHolderName !== undefined)
      updateData.cardHolderName = dto.cardHolderName;
    if (dto.expiryMonth !== undefined) updateData.expiryMonth = dto.expiryMonth;
    if (dto.expiryYear !== undefined) updateData.expiryYear = dto.expiryYear;
    if (dto.billingAddress !== undefined)
      updateData.billingAddress = dto.billingAddress;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.pin !== undefined) updateData.pin = dto.pin;

    return await this.cardRepo.update(cardId, updateData);
  }

  async adminDeletePaymentCard(cardId: string, adminId: string): Promise<void> {
    const card = await this.cardRepo.findById(cardId);
    if (!card || card.deletedAt) throw notFound('Payment card', cardId);
    await this.cardRepo.softDeleteCard(cardId, adminId);
  }

  // ─── Payout Accounts ───────────────────────────────────────────

  async listUserPayoutAccounts(userId: string): Promise<PayoutAccount[]> {
    await this.userRepo.findByIdOrThrow(userId);
    return await this.payoutRepo.findByUser(userId);
  }

  async createPayoutAccount(
    userId: string,
    dto: CreatePayoutAccountDto,
  ): Promise<PayoutAccount> {
    await this.userRepo.findByIdOrThrow(userId);

    return await this.payoutRepo.create({
      userId,
      method: dto.method,
      accountHolderName: dto.accountHolderName,
      bankName: dto.bankName ?? null,
      accountNumber: dto.accountNumber ?? null,
      iban: dto.iban ?? null,
      swiftCode: dto.swiftCode ?? null,
      walletAddress: dto.walletAddress ?? null,
      currency: (dto.currency as Currency | undefined) ?? null,
      country: dto.country ?? null,
      createdBy: userId,
    });
  }

  async updatePayoutAccount(
    accountId: string,
    userId: string,
    dto: UpdatePayoutAccountDto,
  ): Promise<PayoutAccount> {
    const account = await this.payoutRepo.findById(accountId);
    if (!account || account.userId !== userId || account.deletedAt) {
      throw notFound('Payout account', accountId);
    }

    const updateData: Prisma.PayoutAccountUncheckedUpdateInput = {
      updatedBy: userId,
    };
    if (dto.accountHolderName !== undefined)
      updateData.accountHolderName = dto.accountHolderName;
    if (dto.bankName !== undefined) updateData.bankName = dto.bankName;
    if (dto.accountNumber !== undefined)
      updateData.accountNumber = dto.accountNumber;
    if (dto.iban !== undefined) updateData.iban = dto.iban;
    if (dto.swiftCode !== undefined) updateData.swiftCode = dto.swiftCode;
    if (dto.walletAddress !== undefined)
      updateData.walletAddress = dto.walletAddress;
    if (dto.currency !== undefined)
      updateData.currency = dto.currency as Currency;
    if (dto.country !== undefined) updateData.country = dto.country;

    return await this.payoutRepo.update(accountId, updateData);
  }

  async deletePayoutAccount(accountId: string, userId: string): Promise<void> {
    const account = await this.payoutRepo.findById(accountId);
    if (!account || account.userId !== userId || account.deletedAt) {
      throw notFound('Payout account', accountId);
    }
    await this.payoutRepo.softDeleteAccount(accountId, userId);
  }

  // ─── Admin Payout Account Management ───────────────────────────

  async adminUpdatePayoutAccount(
    accountId: string,
    adminId: string,
    dto: UpdatePayoutAccountDto,
  ): Promise<PayoutAccount> {
    const account = await this.payoutRepo.findById(accountId);
    if (!account || account.deletedAt)
      throw notFound('Payout account', accountId);

    const updateData: Prisma.PayoutAccountUncheckedUpdateInput = {
      updatedBy: adminId,
    };
    if (dto.accountHolderName !== undefined)
      updateData.accountHolderName = dto.accountHolderName;
    if (dto.bankName !== undefined) updateData.bankName = dto.bankName;
    if (dto.accountNumber !== undefined)
      updateData.accountNumber = dto.accountNumber;
    if (dto.iban !== undefined) updateData.iban = dto.iban;
    if (dto.swiftCode !== undefined) updateData.swiftCode = dto.swiftCode;
    if (dto.walletAddress !== undefined)
      updateData.walletAddress = dto.walletAddress;
    if (dto.currency !== undefined)
      updateData.currency = dto.currency as Currency;
    if (dto.country !== undefined) updateData.country = dto.country;

    return await this.payoutRepo.update(accountId, updateData);
  }

  async adminDeletePayoutAccount(
    accountId: string,
    adminId: string,
  ): Promise<void> {
    const account = await this.payoutRepo.findById(accountId);
    if (!account || account.deletedAt)
      throw notFound('Payout account', accountId);
    await this.payoutRepo.softDeleteAccount(accountId, adminId);
  }

  // ─── User Lifecycle ────────────────────────────────────────────

  async suspendUser(userId: string) {
    await this.userRepo.findByIdOrThrow(userId);
    const updated = await this.userRepo.update(userId, {
      status: UserStatus.SUSPENDED,
    });
    return this.userRepo.findWithRelations(updated.id);
  }

  async activateUser(userId: string) {
    await this.userRepo.findByIdOrThrow(userId);
    const updated = await this.userRepo.update(userId, {
      status: UserStatus.ACTIVE,
    });
    return this.userRepo.findWithRelations(updated.id);
  }

  async deactivateUser(userId: string) {
    await this.userRepo.findByIdOrThrow(userId);
    await this.userRepo.update(userId, {
      status: UserStatus.DEACTIVATED,
      deletedAt: new Date(),
    });

    // Revoke all refresh tokens
    await this.tokenService.revokeAllForUser(userId);

    return { success: true, message: 'User deactivated.' };
  }

  // ─── Password Reset (Admin) ────────────────────────────────────

  async adminResetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findByIdOrThrow(userId);
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.userRepo.transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private sanitizeUser(user: UserWithRelations): SafeUserWithRelations {
    const {
      passwordHash: _ph,
      deletedAt: _da,
      deletedBy: _db,
      ...safe
    } = user as UserWithRelations & {
      passwordHash?: string;
      deletedAt?: Date | null;
      deletedBy?: string | null;
    };

    if (safe.paymentCards) {
      safe.paymentCards = safe.paymentCards.map((card) => {
        const { cvv: _cvv, cardNumber: _cn, ...safeCard } = card;
        return safeCard as PaymentCard;
      });
    }

    return safe as unknown as SafeUserWithRelations;
  }
}
