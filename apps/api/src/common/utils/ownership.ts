import { ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * Assert a fetched entity exists and belongs to the user.
 * Removes the repeated owner-check boilerplate across services.
 */
export function assertOwnership<T extends { userId: string } | null>(
  entity: T,
  userId: string,
  label = 'Resource',
): asserts entity is NonNullable<T> {
  if (!entity) throw new NotFoundException(`${label} not found`);
  if ((entity as { userId: string }).userId !== userId) throw new ForbiddenException();
}
