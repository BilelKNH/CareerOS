import { ProfileContextService } from './profile-context.service';
import { CoachAgentService } from './coach-agent.service';
import { MarketAgentService } from './market-agent.service';
import { CvAgentService } from './cv-agent.service';
import { LlmService } from './llm.service';
import { makePrisma } from '../../test-utils/prisma.mock';

const llm = { available: false } as unknown as LlmService;

function baseProfile(prisma: ReturnType<typeof makePrisma>) {
  prisma.user.findUniqueOrThrow.mockResolvedValue({
    headline: 'QA Automation Engineer',
    location: 'Lille',
    yearsExperience: 5,
    targetRoles: ['SDET'],
    skills: [{ name: 'Playwright', category: 'framework', level: 'senior' }],
    experiences: [{ title: 'QA', company: 'Acme', technologies: ['Playwright'] }],
    certifications: [],
  });
}

describe('CoachAgentService (rules fallback)', () => {
  it('prioritises the most frequent missing skills and maps recos', async () => {
    const prisma = makePrisma();
    baseProfile(prisma);
    prisma.jobMatch.findMany.mockResolvedValue([
      { missingSkills: ['AWS', 'Terraform'] },
      { missingSkills: ['AWS'] },
    ]);
    const coach = new CoachAgentService(prisma, llm, new ProfileContextService(prisma));

    const plan = await coach.plan('u1');

    expect(plan.method).toBe('rules');
    expect(plan.focusSkills[0]).toBe('AWS'); // appears twice
    expect(plan.certifications).toEqual(
      expect.arrayContaining(['AWS Certified Cloud Practitioner']),
    );
  });
});

describe('MarketAgentService', () => {
  it('aggregates demand and computes coverage', async () => {
    const prisma = makePrisma();
    baseProfile(prisma);
    prisma.jobOffer.findMany.mockResolvedValue([
      { requiredSkills: ['Playwright', 'AWS'], technologies: ['Playwright'], salary: '45k', tjm: null },
      { requiredSkills: ['Playwright', 'TypeScript'], technologies: ['TypeScript'], salary: '50k', tjm: null },
    ]);
    const market = new MarketAgentService(prisma, llm, new ProfileContextService(prisma));

    const a = await market.analyze('u1');

    expect(a.totalOffers).toBe(2);
    expect(a.topRequiredSkills[0].name.toLowerCase()).toBe('playwright'); // most demanded
    expect(a.skillCoverage).toBeGreaterThan(0);
  });
});

describe('CvAgentService (template fallback)', () => {
  it('produces a package with ATS keywords from the offer', async () => {
    const prisma = makePrisma();
    baseProfile(prisma);
    prisma.jobOffer.findUnique.mockResolvedValue({
      title: 'QA Engineer',
      company: 'Acme',
      requiredSkills: ['Playwright'],
      technologies: ['Playwright'],
      description: 'Automatisation des tests',
    });
    const cv = new CvAgentService(prisma, llm, new ProfileContextService(prisma));

    const out = await cv.adapt('u1', 'o1');

    expect(out.method).toBe('template');
    expect(out.cvSummary.length).toBeGreaterThan(0);
    expect(out.atsKeywords).toEqual(expect.arrayContaining(['Playwright']));
  });
});
