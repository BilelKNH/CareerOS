import { CvMatchService } from './cv-match.service';
import { MemoryAgentService } from '../ai-analysis/memory-agent.service';
import { LlmService } from '../ai-analysis/llm.service';
import { makePrisma } from '../../test-utils/prisma.mock';

const agent = new MemoryAgentService({ available: false } as unknown as LlmService);
const CV = 'J’ai mis en place un pipeline GitHub Actions pour automatiser les tests Playwright.';

describe('CvMatchService.matchOffer (CV text vs pasted ad)', () => {
  it('scores overlap and flags missing skills', async () => {
    const svc = new CvMatchService(makePrisma(), agent);
    const res = await svc.matchOffer('u1', {
      cvText: CV,
      jobText: 'Recherche QA Playwright, CI/CD et AWS pour une plateforme cloud.',
    });
    expect(res.matchScore).toBeGreaterThan(0);
    expect(res.matchScore).toBeLessThanOrEqual(100);
    expect(res.missingSkills.map((s) => s.toLowerCase())).toContain('aws');
    expect(['élevée', 'moyenne', 'faible']).toContain(res.interviewProbability);
  });

  it('matches against a stored offer (offerId)', async () => {
    const prisma = makePrisma();
    prisma.jobOffer.findUniqueOrThrow.mockResolvedValue({
      title: 'QA Engineer',
      requiredSkills: ['Playwright', 'CI/CD'],
      technologies: ['Playwright'],
    });
    prisma.skill.findMany.mockResolvedValue([{ normalizedName: 'playwright' }]);
    const svc = new CvMatchService(prisma, agent);

    const res = await svc.matchOffer('u1', { offerId: 'o1' });
    expect(res.title).toBe('QA Engineer');
    expect(res.matched.map((s) => s.toLowerCase())).toContain('playwright');
    expect(res.missingSkills.map((s) => s.toLowerCase())).toContain('ci/cd');
  });

  it('throws when neither offerId nor jobText is provided', async () => {
    const svc = new CvMatchService(makePrisma(), agent);
    await expect(svc.matchOffer('u1', {})).rejects.toThrow();
  });
});

describe('CvMatchService.exploreCareers', () => {
  it('ranks CV-related métiers by skill coverage, best first', async () => {
    const svc = new CvMatchService(makePrisma(), agent);
    const results = await svc.exploreCareers('u1', 'Playwright TypeScript CI/CD GitHub Actions');

    expect(results.length).toBeGreaterThan(0);
    // Sorted descending by score.
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
    // A QA role (related to this tech CV) is surfaced.
    expect(results.find((r) => r.role.includes('QA Automation'))).toBeTruthy();
    // Unrelated sectors (sales, HR…) are filtered out for a tech CV.
    expect(results.every((r) => r.sector !== 'Commercial & Vente')).toBe(true);
    expect(results.every((r) => r.sector !== 'Ressources Humaines')).toBe(true);
  });

  it('surfaces sales/retail roles (not tech) for a commercial CV', async () => {
    const svc = new CvMatchService(makePrisma(), agent);
    const results = await svc.exploreCareers(
      'u1',
      'Vente B2B prospection négociation CRM Salesforce relation client',
    );

    expect(results.some((r) => r.sector === 'Commercial & Vente')).toBe(true);
    // No tech sector for a pure sales profile.
    expect(results.every((r) => r.sector !== 'Test & QA')).toBe(true);
    expect(results.every((r) => r.sector !== 'DevOps & Cloud')).toBe(true);
  });
});
