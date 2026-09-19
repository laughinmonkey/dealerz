import { Controller, Get, Post, Delete, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Watchlist')
@Controller('watchlist')
@ApiBearerAuth()
export class WatchlistController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get user watchlist' })
  async list(@Req() req: AuthenticatedRequest) {
    return this.prisma.watchlist.findMany({
      where: { userId: req.user.sub },
      include: {
        listing: {
          include: {
            asset: {
              include: {
                game: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
            seller: { select: { id: true, username: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post(':listingId')
  @ApiOperation({ summary: 'Add listing to watchlist' })
  async add(
    @Req() req: AuthenticatedRequest,
    @Param('listingId') listingId: string,
  ) {
    return this.prisma.watchlist.create({
      data: { userId: req.user.sub, listingId },
    });
  }

  @Delete(':listingId')
  @ApiOperation({ summary: 'Remove listing from watchlist' })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('listingId') listingId: string,
  ) {
    return this.prisma.watchlist.deleteMany({
      where: { userId: req.user.sub, listingId },
    });
  }
}
