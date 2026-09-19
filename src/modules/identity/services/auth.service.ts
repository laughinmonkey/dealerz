import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  Currency,
  UserRole,
  UserStatus,
  OnboardingStage,
} from '@prisma/client';
import {
  BusinessErrors,
  notFound,
} from '../../../common/exceptions/business.exception';
import {
  UserRepository,
  UserProfileRepository,
  UserPermissionRepository,
  RefreshTokenRepository,
} from '../repositories/identity.repositories';
import { TokenService } from './token.service';
import { RegisterDto, LoginDto, ForgotPasswordDto } from '../dto/auth.dto';
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
export class AuthService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly userRepo: UserRepository,
    private readonly profileRepo: UserProfileRepository,
    private readonly permissionRepo: UserPermissionRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
  ) {}

  // ─── Registration ──────────────────────────────────────────────

  async register(dto: RegisterDto) {
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
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          onboardingStage: OnboardingStage.REGISTERED,
          profile: { create: {} },
          permissions: { create: {} },
        },
        include: { profile: true, permissions: true },
      })) as UserWithRelations;

      // Provision wallets for all active currencies
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

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.role,
      user.status,
    );

    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ─── Login ─────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.userRepo.findByEmail(dto.email);

    if (!user || user.status === UserStatus.DEACTIVATED || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Update last login timestamp
    await this.userRepo.update(user.id, {
      lastLoginAt: new Date(),
    });

    const full = await this.userRepo.findWithRelations(user.id);
    const target = full ?? user;

    const tokens = await this.tokenService.generateTokens(
      target.id,
      target.email,
      target.role,
      target.status,
    );

    return { ...tokens, user: this.sanitizeUser(target as UserWithRelations) };
  }

  // ─── Token Refresh ─────────────────────────────────────────────

  async refreshToken(refreshTokenStr: string) {
    return await this.tokenService.rotateRefreshToken(refreshTokenStr);
  }

  // ─── Logout ────────────────────────────────────────────────────

  async logout(userId: string): Promise<void> {
    await this.tokenService.revokeAllForUser(userId);
  }

  // ─── Password Reset ────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findByEmail(dto.email);

    if (!user || user.deletedAt) {
      // Return generic response to avoid email enumeration
      return {
        message: 'If the email exists, a password reset link has been sent.',
      };
    }

    const resetToken = this.tokenService.generateResetToken(user.id);

    // In production, this token would be emailed.
    // For MVP, we return it in the response.
    return {
      message: 'If the email exists, a password reset link has been sent.',
      resetToken,
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const payload = await this.tokenService.verifyResetToken(token);

    if (payload.purpose !== 'password-reset') {
      throw new UnauthorizedException('Invalid reset token purpose.');
    }

    const user = await this.userRepo.findById(payload.sub);
    if (!user || user.deletedAt) {
      throw notFound('User', payload.sub);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.userRepo.transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // Revoke all existing refresh tokens (force re-login everywhere)
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

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

  // ─── Current User ──────────────────────────────────────────────

  async getCurrentUser(userId: string) {
    const user = await this.userRepo.findWithRelations(userId);
    if (!user || user.deletedAt) throw notFound('User', userId);
    return this.sanitizeUser(user);
  }

  // ─── Helpers ───────────────────────────────────────────────────

  /** Removes sensitive fields before returning to clients */
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
        const { cvv: _cvv, cardNumber: _cn, pin: _pin, ...safeCard } = card;
        return safeCard as PaymentCard;
      });
    }

    return safe as unknown as SafeUserWithRelations;
  }
}
