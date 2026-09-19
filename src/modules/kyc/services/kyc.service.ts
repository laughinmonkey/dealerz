import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, OnboardingStage } from '@prisma/client';
import { notFound } from '../../../common/exceptions/business.exception';
import {
  KycRequestRepository,
  KycDocumentRepository,
} from '../repositories/kyc.repositories';
import { UserRepository } from '../../identity/repositories/identity.repositories';
import type { KycRequest, KycDocument } from '@prisma/client';

@Injectable()
export class KycService {
  constructor(
    private readonly kycRequestRepo: KycRequestRepository,
    private readonly kycDocRepo: KycDocumentRepository,
    private readonly userRepo: UserRepository,
  ) {}

  // ─── User KYC Actions ──────────────────────────────────────────

  async submitKyc(
    userId: string,
    notes?: string,
  ): Promise<KycRequest> {
    const user = await this.userRepo.findByIdOrThrow(userId);

    // Check for existing KYC request
    const existing = await this.kycRequestRepo.findByUser(userId);

    // If PENDING, update the existing request instead of creating a new one
    if (existing && existing.status === 'PENDING') {
      return await this.kycRequestRepo.update(existing.id, {
        reviewNotes: notes ?? existing.reviewNotes,
      });
    }

    // If REJECTED, allow the user to resubmit by updating the existing request
    if (existing && existing.status === 'REJECTED') {
      const updated = await this.kycRequestRepo.update(existing.id, {
        status: 'PENDING',
        reviewNotes: notes ?? existing.reviewNotes,
        reviewedBy: null,
        reviewedAt: null,
      });

      // Reset onboarding stage back to KYC_SUBMITTED if needed
      if (
        user.onboardingStage !== OnboardingStage.KYC_APPROVED &&
        user.onboardingStage !== OnboardingStage.TRADING_ENABLED
      ) {
        await this.userRepo.update(userId, {
          onboardingStage: OnboardingStage.KYC_SUBMITTED,
        });
      }

      return updated;
    }

    // Otherwise create a fresh KYC request
    const request = await this.kycRequestRepo.transaction(async (tx) => {
      const kyc = await tx.kycRequest.create({
        data: { userId, reviewNotes: notes ?? null },
      });

      // Advance onboarding stage if not already past KYC
      if (
        user.onboardingStage === 'REGISTERED' ||
        user.onboardingStage === 'PROFILE_COMPLETED' ||
        user.onboardingStage === 'IDENTITY_SUBMITTED'
      ) {
        await tx.user.update({
          where: { id: userId },
          data: { onboardingStage: OnboardingStage.KYC_SUBMITTED },
        });
      }

      return kyc;
    });

    return request;
  }

  async getKycStatus(userId: string): Promise<KycRequest | null> {
    const user = await this.userRepo.findByIdOrThrow(userId);
    return await this.kycRequestRepo.findByUser(userId);
  }

  async uploadDocument(
    kycId: string,
    file: { fileName: string; fileUrl: string; fileType: string; fileSize: number },
  ): Promise<KycDocument> {
    const kyc = await this.kycRequestRepo.findByIdOrThrow(kycId);

    if (kyc.status !== 'PENDING' && kyc.status !== 'REJECTED') {
      throw new BadRequestException(
        'Cannot upload documents to this KYC request.',
      );
    }

    return await this.kycDocRepo.create({
      kycId,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      fileSize: file.fileSize,
    });
  }

  // ─── Admin KYC Actions ─────────────────────────────────────────

  async approveKyc(kycId: string, adminId: string): Promise<KycRequest> {
    const kyc = await this.kycRequestRepo.findByIdOrThrow(kycId);

    if (kyc.status !== 'PENDING') {
      throw new BadRequestException('This KYC request is not in pending status.');
    }

    return await this.kycRequestRepo.transaction(async (tx) => {
      const approved = await tx.kycRequest.update({
        where: { id: kycId },
        data: {
          status: 'APPROVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: kyc.userId },
        data: { onboardingStage: OnboardingStage.KYC_APPROVED },
      });

      return approved;
    });
  }

  async rejectKyc(
    kycId: string,
    adminId: string,
    reason: string,
  ): Promise<KycRequest> {
    const kyc = await this.kycRequestRepo.findByIdOrThrow(kycId);

    if (kyc.status !== 'PENDING') {
      throw new BadRequestException('This KYC request is not in pending status.');
    }

    return await this.kycRequestRepo.update(kycId, {
      status: 'REJECTED',
      reviewedBy: adminId,
      reviewedAt: new Date(),
      reviewNotes: reason,
    });
  }

  async getPendingKyc(): Promise<KycRequest[]> {
    return await this.kycRequestRepo.findPending();
  }
}
