import { MatchingService } from './matching.service';
import { makePrisma } from '../../test-utils/prisma.mock';

function setup(overlap: 'full' | 'partial' | 'none') {
  const prisma = makePrisma();
  const offer = {
    id: 'o1',
    title: 'QA Automation Engineer',
    requiredSkills: ['Playwright', 'TypeScript', 'CI/CD'],
    technologies: ['Playwright'],
    location: 'Lille',
    salary: '45k',
    tjm: null,
    contractType: 'CDI',
  };
  const skillsByOverlap = {
    full: [
      { name: 'Playwright', normalizedName: 'playwright' },
      { name: 'TypeScript', normalizedName: 'typescript' },
      { name: 'CI/CD', normalizedName: 'ci/cd' },
    ],
    partial: [{ name: 'Playwright', normalizedName: 'playwright' }],
    none: [{ name: 'Cooking', normalizedName: 'cooking' }],
  };
  prisma.jobOffer.findUniqueOrThrow.mockResolvedValue(offer);
  prisma.skill.findMany.mockResolvedValue(skillsByOverlap[overlap]);
  prisma.user.findUniqueOrThrow.mockResolvedValue({ yearsExperience: 5 });
  prisma.jobPreference.findUnique.mockResolvedValue(null);
  prisma.jobMatch.upsert.mockImplementation((args: { create: unknown }) => Promise.resolve(args.create));
  return { prisma, svc: new MatchingService(prisma) };
}

describe('MatchingService', () => {
  it('scores full skill overlap at 100% technical', async () => {
    const { svc } = setup('full');
    const m = (await svc.matchOfferById('u1', 'o1')) as { techScore: number; globalScore: number; missingSkills: string[] };
    expect(m.techScore).toBe(100);
    expect(m.missingSkills).toHaveLength(0);
    expect(m.globalScore).toBeGreaterThan(80);
  });

  it('flags missing skills on partial overlap', async () => {
    const { svc } = setup('partial');
    const m = (await svc.matchOfferById('u1', 'o1')) as { techScore: number; missingSkills: string[] };
    expect(m.techScore).toBeLessThan(100);
    expect(m.missingSkills.map((s) => s.toLowerCase())).toEqual(
      expect.arrayContaining(['typescript', 'ci/cd']),
    );
  });

  it('gives a low global score with no overlap', async () => {
    const { svc } = setup('none');
    const m = (await svc.matchOfferById('u1', 'o1')) as { techScore: number; globalScore: number };
    expect(m.techScore).toBe(0);
    expect(m.globalScore).toBeLessThan(70);
  });
});
