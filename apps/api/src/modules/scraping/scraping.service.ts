import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobOffer } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { JobSource, RawOffer, SearchQuery } from './job-source.interface';
import { SampleJobSource } from './sources/sample.source';
import { FranceTravailSource } from './sources/france-travail.source';
import { AdzunaSource } from './sources/adzuna.source';

/** Default searches from the product spec, used when a user has no preferences. */
const DEFAULT_QUERY: SearchQuery = {
  roles: [
    'QA Automation Engineer',
    'Software Engineer in Test',
    'SDET',
    'Test Automation Engineer',
    'QA Lead',
    'Cloud QA',
  ],
  locations: ['Lille', 'Belgique', 'Remote', 'France'],
  keywords: ['Playwright', 'TypeScript', 'AWS', 'Freelance QA', 'CDI QA'],
};

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);
  private readonly sources: JobSource[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const franceTravail = new FranceTravailSource(
      this.config.get<string>('FRANCE_TRAVAIL_CLIENT_ID'),
      this.config.get<string>('FRANCE_TRAVAIL_CLIENT_SECRET'),
    );
    const adzuna = new AdzunaSource(
      this.config.get<string>('ADZUNA_APP_ID'),
      this.config.get<string>('ADZUNA_APP_KEY'),
    );
    // Sample source is the offline fallback — only active when no real source is.
    const anyReal = franceTravail.enabled || adzuna.enabled;
    const sample = new SampleJobSource(!anyReal);
    this.sources = [franceTravail, adzuna, sample];
  }

  listSources() {
    return this.sources.map((s) => ({ source: s.source, enabled: s.enabled }));
  }

  private contentHash(o: RawOffer): string {
    return createHash('sha256').update(`${o.source}|${o.url}|${o.title}`).digest('hex');
  }

  private async buildQuery(userId?: string): Promise<SearchQuery> {
    if (!userId) return DEFAULT_QUERY;
    const prefs = await this.prisma.jobPreference.findUnique({ where: { userId } });
    if (!prefs) return DEFAULT_QUERY;
    return {
      roles: prefs.desiredRoles.length ? prefs.desiredRoles : DEFAULT_QUERY.roles,
      locations: prefs.locations.length ? prefs.locations : DEFAULT_QUERY.locations,
      keywords: prefs.keywords.length ? prefs.keywords : DEFAULT_QUERY.keywords,
      radiusKm: prefs.searchRadiusKm ?? 30,
    };
  }

  /**
   * Run all enabled sources, normalize, dedup by contentHash, and persist new
   * offers. Returns the offers that were newly inserted.
   */
  async run(userId?: string) {
    const query = await this.buildQuery(userId);
    const enabled = this.sources.filter((s) => s.enabled);

    const collected: RawOffer[] = [];
    for (const src of enabled) {
      try {
        collected.push(...(await src.search(query)));
      } catch (err) {
        this.logger.warn(`Source ${src.source} error: ${(err as Error).message}`);
      }
    }

    const inserted: JobOffer[] = [];
    for (const offer of collected) {
      const contentHash = this.contentHash(offer);
      const exists = await this.prisma.jobOffer.findUnique({ where: { contentHash } });
      if (exists) continue; // dedup
      const created = await this.prisma.jobOffer.create({
        data: {
          source: offer.source,
          externalId: offer.externalId,
          url: offer.url,
          contentHash,
          title: offer.title,
          company: offer.company,
          location: offer.location,
          salary: offer.salary,
          tjm: offer.tjm,
          contractType: offer.contractType,
          description: offer.description,
          technologies: offer.technologies,
          requiredSkills: offer.requiredSkills,
          contactEmail: offer.contactEmail,
          publishedAt: offer.publishedAt,
        },
      });
      inserted.push(created);
    }

    this.logger.log(`Scraping: ${collected.length} fetched, ${inserted.length} new.`);
    return inserted;
  }
}
