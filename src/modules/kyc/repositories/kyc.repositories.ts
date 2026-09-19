import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { KycRequest, KycDocument } from '@prisma/client';

// ─── KycRequestRepository ────────────────────────────────────────

@Injectable()
export class KycRequestRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<KycRequest | null> {
    return await this.prisma.kycRequest.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<KycRequest> {
    const request = await this.findById(id);
    if (!request) throw new Error(`KYC request with id ${id} not found`);
    return request;
  }

  async findByUser(userId: string): Promise<KycRequest | null> {
    return await this.prisma.kycRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { documents: true },
    });
  }

  async findPending(): Promise<KycRequest[]> {
    return await this.prisma.kycRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        documents: true,
        user: { select: { id: true, email: true, username: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(data: Prisma.KycRequestUncheckedCreateInput): Promise<KycRequest> {
    return await this.prisma.kycRequest.create({ data });
  }

  async update(
    id: string,
    data: Prisma.KycRequestUncheckedUpdateInput,
  ): Promise<KycRequest> {
    return await this.prisma.kycRequest.update({ where: { id }, data });
  }
}

// ─── KycDocumentRepository ───────────────────────────────────────

@Injectable()
export class KycDocumentRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: Prisma.KycDocumentUncheckedCreateInput): Promise<KycDocument> {
    return await this.prisma.kycDocument.create({ data });
  }

  async findByKycRequest(kycId: string): Promise<KycDocument[]> {
    return await this.prisma.kycDocument.findMany({
      where: { kycId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
