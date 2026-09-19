import { Controller, Get, Post, Patch, Delete, Body, Param, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IdentityService } from '../services/identity.service';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { CreateCardDto, UpdateCardDto } from '../dto/payment.dto';

@ApiTags('Payment Cards')
@Controller('users/me/cards')
@ApiBearerAuth()
export class PaymentCardController {
  constructor(private readonly identityService: IdentityService) {}

  @Get()
  @ApiOperation({ summary: 'List my payment cards' })
  @ApiResponse({ status: 200, description: 'Payment cards retrieved.' })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  async list(@Req() req: AuthenticatedRequest) {
    return await this.identityService.listUserCards(req.user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Add a payment card' })
  @ApiResponse({ status: 201, description: 'Payment card created.' })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCardDto,
  ) {
    return await this.identityService.createPaymentCard(req.user.sub, dto);
  }

  @Patch(':cardId')
  @ApiOperation({ summary: 'Update a payment card' })
  @ApiResponse({ status: 200, description: 'Payment card updated.' })
  @ApiResponse({ status: 404, description: 'Payment card not found.' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
  ) {
    return await this.identityService.updatePaymentCard(cardId, req.user.sub, dto);
  }

  @Delete(':cardId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a payment card' })
  @ApiResponse({ status: 200, description: 'Payment card deleted.' })
  @ApiResponse({ status: 404, description: 'Payment card not found.' })
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('cardId') cardId: string,
  ) {
    await this.identityService.deletePaymentCard(cardId, req.user.sub);
    return { success: true, message: 'Payment card deleted.' };
  }
}
