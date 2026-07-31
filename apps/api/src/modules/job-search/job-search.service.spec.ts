import { JobSearchService } from './job-search.service';
import { makePrisma } from '../../test-utils/prisma.mock';

describe('JobSearchService', () => {
  it('lists offers', async () => {
    const prisma = makePrisma();
    prisma.jobOffer.findMany.mockResolvedValue([{ id: 'o1', matches: [] }]);
    expect(await new JobSearchService(prisma).listOffers('u1')).toHaveLength(1);
  });

  it('returns an offer with its match', async () => {
    const prisma = makePrisma();
    prisma.jobOffer.findUnique.mockResolvedValue({ id: 'o1', matches: [{ globalScore: 90 }] });
    const res = await new JobSearchService(prisma).getOffer('u1', 'o1');
    expect(res.match).toEqual({ globalScore: 90 });
  });

  it('throws when an offer is missing', async () => {
    const prisma = makePrisma();
    prisma.jobOffer.findUnique.mockResolvedValue(null);
    await expect(new JobSearchService(prisma).getOffer('u1', 'x')).rejects.toThrow();
  });

  it('lists matches', async () => {
    const prisma = makePrisma();
    prisma.jobMatch.findMany.mockResolvedValue([{ globalScore: 88 }]);
    expect(await new JobSearchService(prisma).listMatches('u1')).toHaveLength(1);
  });
});
