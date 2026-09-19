import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IdentityService } from '../services/identity.service';
import { AuthService } from '../services/auth.service';
import { AdminActivityService } from '../../admin/services/admin-activity.service';
import { Roles } from '../../../common/decorators/auth.decorator';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { UpdateProfileDto, UpdateIdentityDto } from '../dto/profile.dto';
import {
  CreateCardDto, UpdateCardDto,
  CreatePayoutAccountDto, UpdatePayoutAccountDto,
} from '../dto/payment.dto';
import { CreateUserDto, UpdateUserDto, UpdatePermissionsDto, AdminResetPasswordDto } from '../dto/admin-user.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Admin - Users')
@Controller('admin/users')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminUserController {
  constructor(
    private readonly identityService: IdentityService,
    private readonly authService: AuthService,
    private readonly activityService: AdminActivityService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── User CRUD ─────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved.' })
  async list(@Query() pagination: PaginationDto) {
    return await this.identityService.listUsers({
      page: pagination.page,
      pageSize: pagination.pageSize,
      search: pagination.search,
    });
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async get(@Param('userId') userId: string) {
    return await this.identityService.getUserById(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Admin creates a user' })
  @ApiResponse({ status: 201, description: 'User created.' })
  @ApiResponse({ status: 409, description: 'Email or username already exists.' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateUserDto,
  ) {
    const user = await this.identityService.createUser(dto);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'CREATE_USER',
      targetResource: 'user',
      resourceId: (user as { id: string }).id,
      summary: `Created user ${dto.email}`,
    });

    return user;
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Admin updates a user' })
  @ApiResponse({ status: 200, description: 'User updated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.identityService.updateUser(userId, dto);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'UPDATE_USER',
      targetResource: 'user',
      resourceId: userId,
      summary: `Updated user ${userId}`,
    });

    return user;
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Admin deactivates (soft-deletes) a user' })
  @ApiResponse({ status: 200, description: 'User deactivated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    const result = await this.identityService.deactivateUser(userId);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'DEACTIVATE_USER',
      targetResource: 'user',
      resourceId: userId,
      summary: `Deactivated user ${userId}`,
    });

    return result;
  }

  @Get(':userId/profile')
  @ApiOperation({ summary: 'Get user profile (admin)' })
  async getProfile(@Param('userId') userId: string) {
    return await this.identityService.getUserProfile(userId);
  }

  @Patch(':userId/profile')
  @ApiOperation({ summary: 'Admin updates user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated.' })
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.identityService.updateProfile(userId, dto);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'UPDATE_USER_PROFILE',
      targetResource: 'user_profile',
      resourceId: userId,
      summary: `Updated profile for user ${userId}`,
    });

    return profile;
  }

  @Get(':userId/identity')
  @ApiOperation({ summary: 'Get user identity (admin)' })
  async getIdentity(@Param('userId') userId: string) {
    return await this.identityService.getUserIdentity(userId);
  }

  @Patch(':userId/identity')
  @ApiOperation({ summary: 'Admin updates user identity' })
  @ApiResponse({ status: 200, description: 'Identity updated.' })
  async updateIdentity(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: UpdateIdentityDto,
  ) {
    const identity = await this.identityService.updateIdentity(userId, dto);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'UPDATE_USER_IDENTITY',
      targetResource: 'user_identity',
      resourceId: userId,
      summary: `Updated identity for user ${userId}`,
    });

    return identity;
  }

  @Get(':userId/permissions')
  @ApiOperation({ summary: 'Get user permissions (admin)' })
  async getPermissions(@Param('userId') userId: string) {
    return await this.identityService.getPermissions(userId);
  }

  @Patch(':userId/permissions')
  @ApiOperation({ summary: 'Admin updates user permissions' })
  @ApiResponse({ status: 200, description: 'Permissions updated.' })
  async updatePermissions(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    const permissions = await this.identityService.updatePermissions(userId, dto);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'UPDATE_USER_PERMISSIONS',
      targetResource: 'user_permissions',
      resourceId: userId,
      summary: `Updated permissions for user ${userId}`,
    });

    return permissions;
  }

  // ─── Admin: User Payment Cards ─────────────────────────────────

  @Get(':userId/cards')
  @ApiOperation({ summary: 'List user payment cards' })
  @ApiResponse({ status: 200, description: 'Payment cards retrieved.' })
  async listCards(@Param('userId') userId: string) {
    return await this.identityService.listUserCards(userId);
  }

  @Post(':userId/cards')
  @ApiOperation({ summary: 'Create payment card for user' })
  @ApiResponse({ status: 201, description: 'Payment card created.' })
  async createCard(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: CreateCardDto,
  ) {
    const card = await this.identityService.createPaymentCard(userId, dto);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'CREATE_PAYMENT_CARD',
      targetResource: 'payment_card',
      resourceId: (card as { id: string }).id,
      summary: `Created payment card for user ${userId}`,
    });

    return card;
  }

  @Patch(':userId/cards/:cardId')
  @ApiOperation({ summary: 'Update user payment card' })
  @ApiResponse({ status: 200, description: 'Payment card updated.' })
  @ApiResponse({ status: 404, description: 'Payment card not found.' })
  async updateCard(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
  ) {
    const card = await this.identityService.adminUpdatePaymentCard(cardId, req.user.sub, dto);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'UPDATE_PAYMENT_CARD',
      targetResource: 'payment_card',
      resourceId: cardId,
      summary: `Updated payment card ${cardId} for user ${userId}`,
    });

    return card;
  }

  @Delete(':userId/cards/:cardId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user payment card' })
  @ApiResponse({ status: 200, description: 'Payment card deleted.' })
  async deleteCard(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Param('cardId') cardId: string,
  ) {
    await this.identityService.adminDeletePaymentCard(cardId, req.user.sub);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'DELETE_PAYMENT_CARD',
      targetResource: 'payment_card',
      resourceId: cardId,
      summary: `Deleted payment card ${cardId} for user ${userId}`,
    });

    return { success: true, message: 'Payment card deleted.' };
  }

  // ─── Admin: User Payout Accounts ───────────────────────────────

  @Get(':userId/payout-accounts')
  @ApiOperation({ summary: 'List user payout accounts' })
  @ApiResponse({ status: 200, description: 'Payout accounts retrieved.' })
  async listPayoutAccounts(@Param('userId') userId: string) {
    return await this.identityService.listUserPayoutAccounts(userId);
  }

  @Post(':userId/payout-accounts')
  @ApiOperation({ summary: 'Create payout account for user' })
  @ApiResponse({ status: 201, description: 'Payout account created.' })
  async createPayoutAccount(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: CreatePayoutAccountDto,
  ) {
    const account = await this.identityService.createPayoutAccount(userId, dto);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'CREATE_PAYOUT_ACCOUNT',
      targetResource: 'payout_account',
      resourceId: (account as { id: string }).id,
      summary: `Created payout account for user ${userId}`,
    });

    return account;
  }

  @Patch(':userId/payout-accounts/:accountId')
  @ApiOperation({ summary: 'Update user payout account' })
  @ApiResponse({ status: 200, description: 'Payout account updated.' })
  @ApiResponse({ status: 404, description: 'Payout account not found.' })
  async updatePayoutAccount(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Param('accountId') accountId: string,
    @Body() dto: UpdatePayoutAccountDto,
  ) {
    const account = await this.identityService.adminUpdatePayoutAccount(accountId, req.user.sub, dto);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'UPDATE_PAYOUT_ACCOUNT',
      targetResource: 'payout_account',
      resourceId: accountId,
      summary: `Updated payout account ${accountId} for user ${userId}`,
    });

    return account;
  }

  @Delete(':userId/payout-accounts/:accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user payout account' })
  @ApiResponse({ status: 200, description: 'Payout account deleted.' })
  async deletePayoutAccount(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Param('accountId') accountId: string,
  ) {
    await this.identityService.adminDeletePayoutAccount(accountId, req.user.sub);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'DELETE_PAYOUT_ACCOUNT',
      targetResource: 'payout_account',
      resourceId: accountId,
      summary: `Deleted payout account ${accountId} for user ${userId}`,
    });

    return { success: true, message: 'Payout account deleted.' };
  }

  // ─── Admin: User Lifecycle ─────────────────────────────────────

  @Post(':userId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate user' })
  @ApiResponse({ status: 200, description: 'User activated.' })
  async activate(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    const user = await this.identityService.activateUser(userId);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'ACTIVATE_USER',
      targetResource: 'user',
      resourceId: userId,
      summary: `Activated user ${userId}`,
    });

    return user;
  }

  @Post(':userId/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend user' })
  @ApiResponse({ status: 200, description: 'User suspended.' })
  async suspend(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    const user = await this.identityService.suspendUser(userId);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'SUSPEND_USER',
      targetResource: 'user',
      resourceId: userId,
      summary: `Suspended user ${userId}`,
    });

    return user;
  }

  @Post(':userId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiResponse({ status: 200, description: 'User deactivated.' })
  async deactivate(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    const result = await this.identityService.deactivateUser(userId);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'DEACTIVATE_USER',
      targetResource: 'user',
      resourceId: userId,
      summary: `Deactivated user ${userId}`,
    });

    return result;
  }

  @Post(':userId/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin resets user password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async resetPassword(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    await this.authService.adminResetPassword(userId, dto.password);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action: 'RESET_USER_PASSWORD',
      targetResource: 'user',
      resourceId: userId,
      summary: `Reset password for user ${userId}`,
    });

    return { success: true, message: 'Password reset successfully.' };
  }

  // ─── Admin: Trading Capabilities ──────────────────────────────

  @Post(':userId/enable-buying')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable buying capability for user' })
  async enableBuying(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.setTradingCapability(req, userId, 'canBuy', true, 'ENABLE_BUYING', `Enabled buying for user ${userId}`);
  }

  @Post(':userId/disable-buying')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable buying capability for user' })
  async disableBuying(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.setTradingCapability(req, userId, 'canBuy', false, 'DISABLE_BUYING', `Disabled buying for user ${userId}`);
  }

  @Post(':userId/enable-selling')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable selling capability for user' })
  async enableSelling(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.setTradingCapability(req, userId, 'canSell', true, 'ENABLE_SELLING', `Enabled selling for user ${userId}`);
  }

  @Post(':userId/disable-selling')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable selling capability for user' })
  async disableSelling(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.setTradingCapability(req, userId, 'canSell', false, 'DISABLE_SELLING', `Disabled selling for user ${userId}`);
  }

  @Post(':userId/enable-bidding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable bidding capability for user' })
  async enableBidding(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.setTradingCapability(req, userId, 'canBid', true, 'ENABLE_BIDDING', `Enabled bidding for user ${userId}`);
  }

  @Post(':userId/disable-bidding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable bidding capability for user' })
  async disableBidding(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.setTradingCapability(req, userId, 'canBid', false, 'DISABLE_BIDDING', `Disabled bidding for user ${userId}`);
  }

  // ─── Admin: User Preferences ──────────────────────────────────

  @Get(':userId/preferences')
  @ApiOperation({ summary: 'Get user preferences (admin)' })
  async getPreferences(@Param('userId') userId: string) {
    return this.prisma.userPreferences.findUnique({ where: { userId } });
  }

  @Patch(':userId/preferences')
  @ApiOperation({ summary: 'Update user preferences (admin)' })
  async updatePreferences(@Param('userId') userId: string, @Body() body: Record<string, any>) {
    const allowed = ['emailNotifs', 'pushNotifs', 'inAppNotifs', 'profilePublic', 'showActivity', 'language', 'currency', 'timezone'];
    const data: Record<string, any> = {};
    for (const key of allowed) if (body[key] !== undefined) data[key] = body[key];
    return this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  // ─── Admin: User Watchlist ────────────────────────────────────

  @Get(':userId/watchlist')
  @ApiOperation({ summary: 'Get user watchlist (admin)' })
  async getWatchlist(@Param('userId') userId: string) {
    return this.prisma.watchlist.findMany({
      where: { userId },
      include: { listing: { include: { asset: { select: { title: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Admin: User Activity ─────────────────────────────────────

  @Get(':userId/activity')
  @ApiOperation({ summary: 'Get user activity (admin)' })
  async getActivity(@Param('userId') userId: string) {
    const [transactions, bids] = await Promise.all([
      this.prisma.marketplaceTransaction.findMany({
        where: { buyerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: { asset: { select: { title: true } } },
      }),
      this.prisma.bid.findMany({
        where: { bidderId: userId },
        orderBy: { placedAt: 'desc' },
        take: 10,
        include: { listing: { select: { title: true } } },
      }),
    ]);
    return { transactions, bids };
  }

  private async setTradingCapability(
    req: AuthenticatedRequest,
    userId: string,
    field: string,
    value: boolean,
    action: string,
    summary: string,
  ) {
    const permissions = await this.identityService.updatePermissions(userId, { [field]: value } as any);

    await this.activityService.logActivity({
      adminId: req.user.sub,
      action,
      targetResource: 'user_permissions',
      resourceId: userId,
      summary,
    });

    return permissions;
  }
}
