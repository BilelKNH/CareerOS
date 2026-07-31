import { ForbiddenException } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { makePrisma } from '../../test-utils/prisma.mock';

describe('SkillsService', () => {
  it('lists skills', async () => {
    const prisma = makePrisma();
    prisma.skill.findMany.mockResolvedValue([{ id: 's1' }]);
    expect(await new SkillsService(prisma).list('u1')).toHaveLength(1);
  });

  it('upserts with a normalized name', async () => {
    const prisma = makePrisma();
    prisma.skill.upsert.mockImplementation((a: { create: { normalizedName: string } }) => Promise.resolve(a.create));
    const res = await new SkillsService(prisma).upsert('u1', { name: '  GitHub Actions ' });
    expect((res as { normalizedName: string }).normalizedName).toBe('github actions');
  });

  it('rejects updating a skill owned by someone else', async () => {
    const prisma = makePrisma();
    prisma.skill.findUnique.mockResolvedValue({ userId: 'other' });
    await expect(new SkillsService(prisma).update('u1', 's1', { name: 'X' })).rejects.toThrow(ForbiddenException);
  });

  it('deletes an owned skill', async () => {
    const prisma = makePrisma();
    prisma.skill.findUnique.mockResolvedValue({ userId: 'u1' });
    prisma.skill.delete.mockResolvedValue({});
    expect(await new SkillsService(prisma).remove('u1', 's1')).toEqual({ deleted: true });
  });
});
