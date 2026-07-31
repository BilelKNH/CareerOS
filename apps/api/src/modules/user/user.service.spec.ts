import { UserService } from './user.service';
import { makePrisma } from '../../test-utils/prisma.mock';

describe('UserService.recomputeEmployabilityScore', () => {
  it('combines skills, experience, certs and projects (capped)', async () => {
    const prisma = makePrisma();
    prisma.skill.count.mockResolvedValue(5); // 5*4 = 20
    prisma.user.findUniqueOrThrow.mockResolvedValue({ yearsExperience: 5 }); // 5*5 = 25
    prisma.certification.count.mockResolvedValue(0);
    prisma.project.count.mockResolvedValue(0);
    prisma.user.update.mockResolvedValue({});

    const svc = new UserService(prisma);
    const score = await svc.recomputeEmployabilityScore('u1');

    expect(score).toBe(45);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { employabilityScore: 45 },
    });
  });

  it('caps each component (e.g. many skills -> 40 max)', async () => {
    const prisma = makePrisma();
    prisma.skill.count.mockResolvedValue(50); // capped at 40
    prisma.user.findUniqueOrThrow.mockResolvedValue({ yearsExperience: 20 }); // capped at 35
    prisma.certification.count.mockResolvedValue(10); // capped at 15
    prisma.project.count.mockResolvedValue(10); // capped at 10
    prisma.user.update.mockResolvedValue({});

    const svc = new UserService(prisma);
    expect(await svc.recomputeEmployabilityScore('u1')).toBe(100);
  });
});
