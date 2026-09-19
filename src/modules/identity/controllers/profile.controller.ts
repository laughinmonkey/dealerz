import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { IdentityService } from '../services/identity.service';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { UpdateProfileDto, UpdateIdentityDto } from '../dto/profile.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Profile')
@Controller('users/me')
@ApiBearerAuth()
export class ProfileController {
  constructor(
    private readonly identityService: IdentityService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved.' })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  async getProfile(@Req() req: AuthenticatedRequest) {
    return await this.identityService.getUserProfile(req.user.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated.' })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return await this.identityService.updateProfile(req.user.sub, {
      ...dto,
      dateOfBirth: dto.dateOfBirth
        ? new Date(dto.dateOfBirth).toISOString()
        : undefined,
    });
  }

  @Get('identity')
  @ApiOperation({ summary: 'Get current user identity documents' })
  @ApiResponse({ status: 200, description: 'Identity documents retrieved.' })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  async getIdentity(@Req() req: AuthenticatedRequest) {
    return await this.identityService.getUserIdentity(req.user.sub);
  }

  @Patch('identity')
  @ApiOperation({ summary: 'Update identity documents' })
  @ApiResponse({ status: 200, description: 'Identity documents updated.' })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  async updateIdentity(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateIdentityDto,
  ) {
    return await this.identityService.updateIdentity(req.user.sub, dto);
  }

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Get dashboard statistics for current user' })
  async dashboardStats(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const [activeListings, assets, txCount, wallets] = await Promise.all([
      this.prisma.listing.count({
        where: { sellerId: userId, listingStatus: 'ACTIVE', deletedAt: null },
      }),
      this.prisma.asset.count({
        where: { ownerId: userId, ownerType: 'USER', deletedAt: null },
      }),
      this.prisma.marketplaceTransaction.count({ where: { buyerId: userId } }),
      this.prisma.wallet.findMany({ where: { userId } }),
    ]);
    return {
      activeListings,
      assetsOwned: assets,
      totalTransactions: txCount,
      walletBalances: wallets.map((w) => ({
        currency: w.currency,
        available: Number(w.availableBalance),
        pending: Number(w.pendingBalance),
      })),
    };
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent activity for current user' })
  async activity(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const [transactions, bids] = await Promise.all([
      this.prisma.marketplaceTransaction.findMany({
        where: { buyerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { asset: { select: { title: true } } },
      }),
      this.prisma.bid.findMany({
        where: { bidderId: userId },
        orderBy: { placedAt: 'desc' },
        take: 5,
        include: { listing: { select: { title: true } } },
      }),
    ]);
    return { transactions, bids };
  }
}
