import { Controller, Get, Post, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public, Roles } from '../../../common/decorators/auth.decorator';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { BidService } from '../services/bid.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PlaceBidDto } from '../dto/bid.dto';

@ApiTags('Bids')
@Controller()
@ApiBearerAuth()
export class BidController {
  constructor(private readonly bidService: BidService) {}

  @Post('listings/:listingId/bids')
  @ApiOperation({ summary: 'Place a bid on an auction listing' })
  async placeBid(
    @Req() req: AuthenticatedRequest,
    @Param('listingId') listingId: string,
    @Body() dto: PlaceBidDto,
  ) {
    return this.bidService.placeBid(listingId, req.user.sub, dto.amount);
  }

  @Get('listings/:listingId/bids')
  @Public()
  @ApiOperation({ summary: 'Get bids for a listing' })
  async getListingBids(@Param('listingId') listingId: string, @Query() pagination: PaginationDto) {
    return this.bidService.getListingBids(listingId, pagination.page, pagination.pageSize);
  }

  @Get('bids/recent')
  @Public()
  @ApiOperation({ summary: 'Get most recent bids across the marketplace' })
  async getRecentBids() {
    return this.bidService.getRecentBids(10);
  }

  @Get('bids')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my bids' })
  async getMyBids(@Req() req: AuthenticatedRequest, @Query() pagination: PaginationDto) {
    return this.bidService.getMyBids(req.user.sub, pagination.page, pagination.pageSize);
  }
}

@ApiTags('Admin - Bids')
@Controller('admin')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminBidController {
  constructor(private readonly bidService: BidService) {}

  @Get('bids')
  async listAll(@Query() pagination: PaginationDto) {
    return this.bidService.getAllBids({ page: pagination.page, pageSize: pagination.pageSize });
  }

  @Get('listings/:listingId/bids')
  @ApiOperation({ summary: 'Get bids for a specific listing (admin)' })
  async getListingBids(
    @Param('listingId') listingId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.bidService.getListingBids(listingId, pagination.page, pagination.pageSize);
  }

  @Post('listings/:listingId/bids')
  @ApiOperation({ summary: 'Place a bid on behalf of a user (admin)' })
  async placeBid(
    @Req() req: AuthenticatedRequest,
    @Param('listingId') listingId: string,
    @Body() dto: { userId?: string; amount: number },
  ) {
    const bidderId = dto.userId || req.user.sub;
    return this.bidService.adminPlaceBid(listingId, bidderId, dto.amount, req.user.sub);
  }

  @Delete('bids/:bidId')
  async removeBid(@Req() req: AuthenticatedRequest, @Param('bidId') bidId: string) {
    await this.bidService.removeBid(bidId, req.user.sub);
    return { success: true, message: 'Bid removed.' };
  }

  @Post('bids/:bidId/mark-winning')
  @ApiOperation({ summary: 'Mark a bid as winning' })
  async markWinningBid(@Param('bidId') bidId: string) {
    return this.bidService.markWinningBid(bidId);
  }

  @Post('listings/:listingId/select-winner')
  async selectWinner(@Param('listingId') listingId: string) {
    return this.bidService.selectWinner(listingId);
  }
}
