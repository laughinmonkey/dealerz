import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Public, Roles } from '../../../common/decorators/auth.decorator';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { ListingService } from '../services/listing.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { CreateListingDto, UpdateListingDto, ListingFilters } from '../dto/listing.dto';

@ApiTags('Listings')
@Controller('listings')
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Browse/search active listings' })
  async search(@Query() pagination: PaginationDto, @Query() filters: ListingFilters) {
    return this.listingService.searchListings({ ...pagination, ...filters });
  }

  @Get('validate/:assetId')
  @ApiOperation({ summary: 'Check whether an asset is eligible to be listed' })
  async validateEligibility(@Param('assetId') assetId: string) {
    return this.listingService.validateListingEligibility(assetId);
  }

  @Get(':listingId')
  @Public()
  @ApiOperation({ summary: 'Get listing detail' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async get(@Param('listingId') listingId: string) {
    return this.listingService.getListing(listingId, true);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a listing for an owned asset' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateListingDto) {
    return this.listingService.createListing(req.user.sub, dto);
  }

  @Patch(':listingId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update listing metadata' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async update(@Param('listingId') listingId: string, @Body() dto: UpdateListingDto) {
    return this.listingService.updateListing(listingId, dto);
  }

  @Post(':listingId/publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a draft listing' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async publish(@Param('listingId') listingId: string) {
    return this.listingService.publishListing(listingId);
  }

  @Post(':listingId/pause')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause an active listing' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async pause(@Param('listingId') listingId: string) {
    return this.listingService.pauseListing(listingId);
  }

  @Post(':listingId/resume')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume a paused listing' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async resume(@Param('listingId') listingId: string) {
    return this.listingService.resumeListing(listingId);
  }

  @Post(':listingId/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a listing' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async cancel(@Param('listingId') listingId: string) {
    return this.listingService.cancelListing(listingId);
  }

  @Get(':listingId/price-history')
  @Public()
  @ApiOperation({ summary: 'Get simulated price history for a listing' })
  async priceHistory(@Param('listingId') listingId: string) {
    return this.listingService.getPriceHistory(listingId);
  }

  @Get(':listingId/sales-history')
  @Public()
  @ApiOperation({ summary: 'Get completed sales history for a listing asset' })
  async salesHistory(@Param('listingId') listingId: string) {
    return this.listingService.getSalesHistory(listingId);
  }

  @Get(':listingId/seller-stats')
  @Public()
  @ApiOperation({ summary: 'Get aggregated seller stats for a listing' })
  async sellerStats(@Param('listingId') listingId: string) {
    return this.listingService.getSellerStats(listingId);
  }

  @Get(':listingId/similar')
  @Public()
  @ApiOperation({ summary: 'Get similar listings' })
  async similar(@Param('listingId') listingId: string) {
    const listing = await this.listingService.getListing(listingId);
    const asset = (listing as any).asset;
    if (!asset) return [];
    const result = await this.listingService.searchListings({
      gameId: asset.gameId,
      assetTypeId: asset.assetTypeId,
      pageSize: 4,
      sort: 'popular',
    });
    return (result.data || []).filter((l: any) => l.id !== listingId).slice(0, 4);
  }

  @Get(':listingId/market-stats')
  @Public()
  @ApiOperation({ summary: 'Get market stats for a listing' })
  async marketStats(@Param('listingId') listingId: string) {
    const listing = await this.listingService.getListing(listingId);
    const asset = (listing as any).asset;
    if (!asset) return null;
    const similar = await this.listingService.searchListings({
      gameId: asset.gameId,
      assetTypeId: asset.assetTypeId,
      pageSize: 100,
    });
    const items = (similar.data || []).filter((l: any) => l.listingStatus === 'ACTIVE');
    const prices = items.map((l: any) => Number(l.askingPrice || l.currentBid || 0)).filter((p: number) => p > 0);
    return {
      volume24h: items.length,
      highestSale: prices.length ? Math.max(...prices) : 0,
      lowestSale: prices.length ? Math.min(...prices) : 0,
      averagePrice: prices.length ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length) : 0,
      activeListings: items.length,
      completedSales: items.filter((l: any) => l.listingStatus === 'COMPLETED').length,
    };
  }
}

@ApiTags('Admin - Listings')
@Controller('admin/listings')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminListingController {
  constructor(private readonly listingService: ListingService) {}

  @Get()
  @ApiOperation({ summary: 'Search all listings (any status)' })
  async list(
    @Query() pagination: PaginationDto,
    @Query() filters: ListingFilters,
  ) {
    // Admin sees all statuses by default (unless an explicit status filter is set)
    return this.listingService.searchListings({ ...pagination, ...filters }, true);
  }

  @Get(':listingId')
  @ApiOperation({ summary: 'Get listing detail' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async get(@Param('listingId') listingId: string) {
    return this.listingService.getListing(listingId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a listing (optionally on behalf of a user or platform)' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateListingDto) {
    return this.listingService.createListing(req.user.sub, dto, true);
  }

  @Patch(':listingId')
  @ApiOperation({ summary: 'Update any listing' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async update(@Param('listingId') listingId: string, @Body() dto: UpdateListingDto) {
    return this.listingService.updateListing(listingId, dto);
  }

  @Delete(':listingId')
  @ApiOperation({ summary: 'Soft-delete a listing' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async delete(@Param('listingId') listingId: string) {
    return this.listingService.deleteListing(listingId);
  }

  @Post(':listingId/pause')
  @ApiOperation({ summary: 'Admin pause any active listing' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async pause(@Param('listingId') listingId: string) {
    return this.listingService.pauseListing(listingId);
  }

  @Post(':listingId/resume')
  @ApiOperation({ summary: 'Admin resume any paused listing' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async resume(@Param('listingId') listingId: string) {
    return this.listingService.resumeListing(listingId);
  }

  @Post(':listingId/cancel')
  @ApiOperation({ summary: 'Admin cancel any cancellable listing' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async cancel(@Param('listingId') listingId: string) {
    return this.listingService.cancelListing(listingId);
  }

  @Post(':listingId/complete')
  @ApiOperation({ summary: 'Admin mark a listing as completed' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async complete(@Param('listingId') listingId: string) {
    return this.listingService.completeListing(listingId);
  }

  @Post(':listingId/expire')
  @ApiOperation({ summary: 'Admin force-expire a listing' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async expire(@Param('listingId') listingId: string) {
    return this.listingService.expireListing(listingId);
  }

  @Post(':listingId/publish')
  @ApiOperation({ summary: 'Approve and publish a draft listing (makes it ACTIVE)' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async publish(@Param('listingId') listingId: string) {
    return this.listingService.publishListing(listingId);
  }

  @Post(':listingId/reject')
  @ApiOperation({ summary: 'Reject a draft listing (moves to CANCELLED)' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  async rejectListing(@Param('listingId') listingId: string) {
    return this.listingService.rejectListing(listingId);
  }
}
