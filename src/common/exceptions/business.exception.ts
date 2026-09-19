import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  public readonly errorCode: string;

  constructor(
    errorCode: string,
    message: string,
    status: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY,
  ) {
    super(
      {
        success: false,
        message,
        errors: [{ field: 'business', message, code: errorCode }],
      },
      status,
    );
    this.errorCode = errorCode;
  }
}

// Pre-defined business exceptions for common cases
export const BusinessErrors = {
  INSUFFICIENT_WALLET_BALANCE: (currency?: string) =>
    new BusinessException(
      'INSUFFICIENT_WALLET_BALANCE',
      `Insufficient ${currency || 'wallet'} balance.`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    ),

  LISTING_NOT_ACTIVE: () =>
    new BusinessException(
      'LISTING_NOT_ACTIVE',
      'This listing is not currently active.',
      HttpStatus.CONFLICT,
    ),

  AUCTION_ALREADY_ENDED: () =>
    new BusinessException(
      'AUCTION_ALREADY_ENDED',
      'The auction has already ended.',
      HttpStatus.CONFLICT,
    ),

  BID_TOO_LOW: (currentBid: number) =>
    new BusinessException(
      'BID_TOO_LOW',
      `Bid must exceed the current bid of ${currentBid}.`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    ),

  CANNOT_BID_OWN_LISTING: () =>
    new BusinessException(
      'CANNOT_BID_OWN_LISTING',
      'You cannot bid on your own listing.',
      HttpStatus.CONFLICT,
    ),

  BIDDING_DISABLED: () =>
    new BusinessException(
      'BIDDING_DISABLED',
      'Your account does not have bidding enabled.',
      HttpStatus.FORBIDDEN,
    ),

  LISTING_ALREADY_SOLD: () =>
    new BusinessException(
      'LISTING_ALREADY_SOLD',
      'This listing has already been sold.',
      HttpStatus.CONFLICT,
    ),

  BUYING_DISABLED: () =>
    new BusinessException(
      'BUYING_DISABLED',
      'Your account does not have buying enabled.',
      HttpStatus.FORBIDDEN,
    ),

  DEPOSIT_ALREADY_PROCESSED: () =>
    new BusinessException(
      'DEPOSIT_ALREADY_PROCESSED',
      'This deposit has already been processed.',
      HttpStatus.CONFLICT,
    ),

  WITHDRAWAL_ALREADY_PROCESSED: () =>
    new BusinessException(
      'WITHDRAWAL_ALREADY_PROCESSED',
      'This withdrawal has already been processed.',
      HttpStatus.CONFLICT,
    ),

  ASSET_NOT_APPROVED: () =>
    new BusinessException(
      'ASSET_NOT_APPROVED',
      'Only approved assets can be listed.',
      HttpStatus.UNPROCESSABLE_ENTITY,
    ),

  ASSET_ALREADY_LISTED: () =>
    new BusinessException(
      'ASSET_ALREADY_LISTED',
      'This asset already has an active listing.',
      HttpStatus.CONFLICT,
    ),

  NOT_ASSET_OWNER: () =>
    new BusinessException(
      'NOT_ASSET_OWNER',
      'You do not own this asset.',
      HttpStatus.FORBIDDEN,
    ),

  INVALID_ASSET_STATUS_TRANSITION: (current: string, target: string) =>
    new BusinessException(
      'INVALID_ASSET_STATUS_TRANSITION',
      `Cannot transition asset from ${current} to ${target}.`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    ),

  GAME_NOT_ACTIVE: () =>
    new BusinessException(
      'GAME_NOT_ACTIVE',
      'Cannot create assets for an inactive game.',
      HttpStatus.UNPROCESSABLE_ENTITY,
    ),

  ASSET_TYPE_NOT_ACTIVE: () =>
    new BusinessException(
      'ASSET_TYPE_NOT_ACTIVE',
      'Cannot create assets with an inactive asset type.',
      HttpStatus.UNPROCESSABLE_ENTITY,
    ),

  GAME_NOT_FOUND: (gameId: string) =>
    new BusinessException(
      'GAME_NOT_FOUND',
      `Game with ID ${gameId} not found or inactive.`,
      HttpStatus.NOT_FOUND,
    ),

  ASSET_TYPE_NOT_FOUND: (typeId: string) =>
    new BusinessException(
      'ASSET_TYPE_NOT_FOUND',
      `Asset Type with ID ${typeId} not found or inactive.`,
      HttpStatus.NOT_FOUND,
    ),

  EMAIL_ALREADY_EXISTS: () =>
    new BusinessException(
      'EMAIL_ALREADY_EXISTS',
      'An account with this email already exists.',
      HttpStatus.CONFLICT,
    ),

  USERNAME_ALREADY_EXISTS: () =>
    new BusinessException(
      'USERNAME_ALREADY_EXISTS',
      'An account with this username already exists.',
      HttpStatus.CONFLICT,
    ),
};

export function notFound(resource: string, id?: string): BusinessException {
  return new BusinessException(
    'NOT_FOUND',
    id ? `${resource} with ID ${id} not found.` : `${resource} not found.`,
    HttpStatus.NOT_FOUND,
  );
}
