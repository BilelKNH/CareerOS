import { ExperiencesService } from './experiences.service';
import { makePrisma } from '../../test-utils/prisma.mock';

describe('ExperiencesService.recomputeYearsExperience', () => {
  it('merges overlapping periods (no double counting)', async () => {
    const prisma = makePrisma();
    prisma.experience.findMany.mockResolvedValue([
      { startDate: new Date('2020-01-01'), endDate: new Date('2022-01-01') },
      { startDate: new Date('2021-01-01'), endDate: new Date('2023-01-01') },
    ]);
    prisma.user.update.mockResolvedValue({});

    const svc = new ExperiencesService(prisma);
    const years = await svc.recomputeYearsExperience('u1');

    // 2020->2023 merged = ~3 years, not 4.
    expect(years).toBeCloseTo(3, 0);
  });

  it('sums disjoint periods', async () => {
    const prisma = makePrisma();
    prisma.experience.findMany.mockResolvedValue([
      { startDate: new Date('2016-01-01'), endDate: new Date('2018-01-01') },
      { startDate: new Date('2020-01-01'), endDate: new Date('2022-01-01') },
    ]);
    prisma.user.update.mockResolvedValue({});

    const svc = new ExperiencesService(prisma);
    expect(await svc.recomputeYearsExperience('u1')).toBeCloseTo(4, 0);
  });
});
