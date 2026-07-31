import { UserService } from './user.service';
import { makePrisma } from '../../test-utils/prisma.mock';

describe('UserService CRUD', () => {
  it('returns the profile', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.c' });
    expect(await new UserService(prisma).getProfile('u1')).toMatchObject({ email: 'a@b.c' });
  });

  it('throws NotFound for a missing profile', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(new UserService(prisma).getProfile('u1')).rejects.toThrow();
  });

  it('updates the profile and preferences', async () => {
    const prisma = makePrisma();
    prisma.user.update.mockResolvedValue({ id: 'u1' });
    prisma.jobPreference.upsert.mockResolvedValue({ userId: 'u1' });
    const svc = new UserService(prisma);
    await svc.updateProfile('u1', { fullName: 'Bilel' });
    await svc.upsertPreferences('u1', { searchRadiusKm: 50 });
    expect(prisma.user.update).toHaveBeenCalled();
    expect(prisma.jobPreference.upsert).toHaveBeenCalled();
  });

  it('exports data without the password hash', async () => {
    const prisma = makePrisma();
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', passwordHash: 'secret', skills: [] });
    const data = await new UserService(prisma).exportData('u1');
    expect((data as { passwordHash?: string }).passwordHash).toBeUndefined();
  });

  it('deletes the account', async () => {
    const prisma = makePrisma();
    prisma.user.delete.mockResolvedValue({});
    expect(await new UserService(prisma).deleteAccount('u1')).toEqual({ deleted: true });
  });
});
