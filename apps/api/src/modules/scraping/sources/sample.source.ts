import { OfferSource } from '@prisma/client';
import { JobSource, RawOffer, SearchQuery } from '../job-source.interface';

/**
 * Deterministic, offline source used by default and in tests. It fabricates a
 * small set of realistic QA/SDET offers derived from the query so the whole
 * pipeline (dedup → matching → notifications) runs without hitting any site.
 * Replace/augment with real sources (Playwright/API) in production.
 */
export class SampleJobSource implements JobSource {
  readonly source = OfferSource.sample;
  readonly enabled: boolean;

  /** Disabled automatically when a real source (e.g. France Travail) is active. */
  constructor(enabled = true) {
    this.enabled = enabled;
  }

  async search(query: SearchQuery): Promise<RawOffer[]> {
    const role = query.roles[0] ?? 'QA Automation Engineer';
    const location = query.locations[0] ?? 'Remote';

    return [
      {
        source: this.source,
        externalId: 'sample-1',
        url: 'https://example.com/jobs/sample-1',
        title: `${role} (H/F)`,
        company: 'Acme Tech',
        location,
        salary: '45k–58k €',
        contractType: 'CDI',
        description:
          'Automatisation des tests end-to-end avec Playwright et TypeScript, intégration CI/CD via GitHub Actions.',
        technologies: ['Playwright', 'TypeScript', 'GitHub Actions', 'CI/CD'],
        requiredSkills: ['Playwright', 'TypeScript', 'CI/CD', 'QA Automation'],
        contactEmail: 'recrutement@acme-tech.example',
        publishedAt: new Date(),
      },
      {
        source: this.source,
        externalId: 'sample-2',
        url: 'https://example.com/jobs/sample-2',
        title: 'SDET Cloud (H/F)',
        company: 'Nimbus',
        location: 'Lille',
        tjm: '500–600 €',
        contractType: 'Freelance',
        description:
          'SDET pour une plateforme cloud : tests automatisés, AWS, Terraform, pipelines DevOps.',
        technologies: ['Playwright', 'AWS', 'Terraform', 'Docker'],
        requiredSkills: ['QA Automation', 'AWS', 'Terraform', 'CI/CD'],
        publishedAt: new Date(),
      },
    ];
  }
}
