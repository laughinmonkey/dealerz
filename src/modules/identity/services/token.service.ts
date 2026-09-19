import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { UserRole, UserStatus } from '@prisma/client';
import { RefreshTokenRepository } from '../repositories/identity.repositories';
import type { RefreshToken } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly refreshTokenRepo: RefreshTokenRepository,
  ) {}

  /**
   * Generate access token from user payload.
   */
  generateAccessToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload);
  }

  /**
   * Verify an access token and return the decoded payload.
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      return await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  /**
   * Generate a short-lived reset token for password reset.
   */
  generateResetToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, purpose: 'password-reset' },
      { expiresIn: '1h' },
    );
  }

  /**
   * Verify a password reset token.
   */
  async verifyResetToken(token: string): Promise<{ sub: string; purpose: string }> {
    try {
      return await this.jwtService.verifyAsync<{ sub: string; purpose: string }>(
        token,
        { secret: process.env.JWT_SECRET },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token.');
    }
  }

  /**
   * Create a new refresh token for a user.
   * Refresh tokens expire in 7 days.
   */
  async createRefreshToken(userId: string): Promise<RefreshToken> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return await this.refreshTokenRepo.create({
      userId,
      token,
      expiresAt,
    });
  }

  /**
   * Generate both access and refresh tokens for a user.
   */
  async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
    status: UserStatus,
  ): Promise<AuthTokens> {
    const accessToken = this.generateAccessToken({
      sub: userId,
      email,
      role,
      status,
    });

    const refreshToken = await this.createRefreshToken(userId);

    return { accessToken, refreshToken: refreshToken.token };
  }

  /**
   * Rotate a refresh token: revoke the old one, issue new pair.
   */
  async rotateRefreshToken(oldToken: string): Promise<AuthTokens> {
    const stored = await this.refreshTokenRepo.findByToken(oldToken);

    if (!stored || stored.revokedAt || new Date() > stored.expiresAt) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // Revoke old token
    await this.refreshTokenRepo.revokeByToken(oldToken);

    // Issue new pair using stored user info
    return await this.generateTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role,
      stored.user.status,
    );
  }

  /**
   * Revoke all refresh tokens for a user (force re-login).
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokenRepo.revokeAllForUser(userId);
  }
}
