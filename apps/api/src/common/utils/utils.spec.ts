import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { normalizeSkill } from './text.util';
import { assertOwnership } from './ownership';

describe('normalizeSkill', () => {
  it('lowercases, trims and collapses whitespace', () => {
    expect(normalizeSkill('  GitHub   Actions ')).toBe('github actions');
  });
});

describe('assertOwnership', () => {
  it('throws NotFound when entity is null', () => {
    expect(() => assertOwnership(null, 'u1')).toThrow(NotFoundException);
  });

  it('throws Forbidden when owner mismatches', () => {
    expect(() => assertOwnership({ userId: 'other' }, 'u1')).toThrow(ForbiddenException);
  });

  it('passes when the user owns the entity', () => {
    expect(() => assertOwnership({ userId: 'u1' }, 'u1')).not.toThrow();
  });
});
