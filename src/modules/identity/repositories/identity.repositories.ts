import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type {
  User,
  UserProfile,
  UserPermission,
  UserIdentityDocument,
  PaymentCard,
  PayoutAccount,
  RefreshToken,
} from '@prisma/client';

// ─── UserRepository ──────────────────────────────────────────────

@Injectable()
export class UserRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new Error(`User with id ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.prisma.user.findUnique({ where: { username } });
  }

  async findWithRelations(id: string) {
    return await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        permissions: true,
        identityDoc: true,
        paymentCards: { where: { deletedAt: null } },
        payoutAccounts: { where: { deletedAt: null } },
      },
    });
  }

  async findMany(options: {
    where?: Prisma.UserWhereInput;
    include?: Prisma.UserInclude;
    skip?: number;
    take?: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    return await this.prisma.user.findMany(options);
  }

  async count(options: { where?: Prisma.UserWhereInput }): Promise<number> {
    return await this.prisma.user.count(options);
  }

  async create(data: Prisma.UserUncheckedCreateInput): Promise<User> {
    return await this.prisma.user.create({ data });
  }

  async update(
    id: string,
    data: Prisma.UserUncheckedUpdateInput,
  ): Promise<User> {
    return await this.prisma.user.update({ where: { id }, data });
  }

  async softDelete(id: string, deletedBy?: string): Promise<User> {
    return await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: deletedBy ?? null },
    });
  }
}

// ─── UserProfileRepository ───────────────────────────────────────

@Injectable()
export class UserProfileRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async upsertByUserId(
    userId: string,
    data: Prisma.UserProfileUncheckedUpdateInput,
  ): Promise<UserProfile> {
    return await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...data } as Prisma.UserProfileUncheckedCreateInput,
      update: data,
    });
  }
}

// ─── UserPermissionRepository ────────────────────────────────────

@Injectable()
export class UserPermissionRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async upsertByUserId(
    userId: string,
    data: Prisma.UserPermissionUncheckedUpdateInput,
  ): Promise<UserPermission> {
    return await this.prisma.userPermission.upsert({
      where: { userId },
      create: { userId, ...data } as Prisma.UserPermissionUncheckedCreateInput,
      update: data,
    });
  }
}

// ─── UserIdentityDocumentRepository ──────────────────────────────

@Injectable()
export class UserIdentityDocumentRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async upsertByUserId(
    userId: string,
    data: Prisma.UserIdentityDocumentUncheckedUpdateInput,
  ): Promise<UserIdentityDocument> {
    return await this.prisma.userIdentityDocument.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      } as Prisma.UserIdentityDocumentUncheckedCreateInput,
      update: data,
    });
  }
}

// ─── PaymentCardRepository ───────────────────────────────────────

@Injectable()
export class PaymentCardRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<PaymentCard | null> {
    return await this.prisma.paymentCard.findUnique({ where: { id } });
  }

  async findByUser(userId: string): Promise<PaymentCard[]> {
    return await this.prisma.paymentCard.findMany({
      where: { userId, deletedAt: null },
    });
  }

  async create(
    data: Prisma.PaymentCardUncheckedCreateInput,
  ): Promise<PaymentCard> {
    return await this.prisma.paymentCard.create({ data });
  }

  async update(
    id: string,
    data: Prisma.PaymentCardUncheckedUpdateInput,
  ): Promise<PaymentCard> {
    return await this.prisma.paymentCard.update({ where: { id }, data });
  }

  async softDeleteCard(id: string, userId: string): Promise<PaymentCard> {
    return await this.prisma.paymentCard.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
  }
}

// ─── PayoutAccountRepository ─────────────────────────────────────

@Injectable()
export class PayoutAccountRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<PayoutAccount | null> {
    return await this.prisma.payoutAccount.findUnique({ where: { id } });
  }

  async findByUser(userId: string): Promise<PayoutAccount[]> {
    return await this.prisma.payoutAccount.findMany({
      where: { userId, deletedAt: null },
    });
  }

  async create(
    data: Prisma.PayoutAccountUncheckedCreateInput,
  ): Promise<PayoutAccount> {
    return await this.prisma.payoutAccount.create({ data });
  }

  async update(
    id: string,
    data: Prisma.PayoutAccountUncheckedUpdateInput,
  ): Promise<PayoutAccount> {
    return await this.prisma.payoutAccount.update({ where: { id }, data });
  }

  async softDeleteAccount(id: string, userId: string): Promise<PayoutAccount> {
    return await this.prisma.payoutAccount.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
  }
}

// ─── RefreshTokenRepository ──────────────────────────────────────

@Injectable()
export class RefreshTokenRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(
    data: Prisma.RefreshTokenUncheckedCreateInput,
  ): Promise<RefreshToken> {
    return await this.prisma.refreshToken.create({ data });
  }

  async findByToken(
    token: string,
  ): Promise<(RefreshToken & { user: User }) | null> {
    return await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async revokeByToken(token: string): Promise<RefreshToken> {
    return await this.prisma.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<Prisma.BatchPayload> {
    return await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
