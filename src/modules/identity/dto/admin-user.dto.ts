import {
  IsEmail, IsString, IsOptional, IsIn, MinLength, MaxLength, Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'john123' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  username: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsOptional()
  @IsIn([UserRole.SUPER_ADMIN, UserRole.USER])
  role?: UserRole;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'john_new@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'john_new' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  username?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsIn([UserStatus.ACTIVE, UserStatus.SUSPENDED, UserStatus.DEACTIVATED])
  status?: UserStatus;
}

export class UpdatePermissionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  canBuy?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  canSell?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  canBid?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  canDeposit?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  canWithdraw?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  canCreateListing?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  canReceivePayments?: boolean;
}

export class AdminResetPasswordDto {
  @ApiProperty({ example: 'NewPassword123!', description: 'New password for the user' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;
}
