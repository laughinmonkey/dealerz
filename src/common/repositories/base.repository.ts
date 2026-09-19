import { PrismaService } from '../../prisma/prisma.service';
import type { PrismaClient } from '@prisma/client';

/**
 * Lightweight base for repositories. Each concrete repository injects
 * PrismaService and accesses its model directly (e.g., this.prisma.user.findMany).
 * This ensures every Prisma call is fully typed — no `any` model accessor.
 *
 * The base provides shared utility methods that don't require model-specific types.
 */
export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Helper for Prisma transactions. Concrete repositories pass their
   * model-specific operations inside the callback which receives the
   * fully-typed PrismaClient transaction client.
   */
  async transaction<TResult>(
    fn: (tx: PrismaClient) => Promise<TResult>,
  ): Promise<TResult> {
    return this.prisma.$transaction(fn);
  }
}
