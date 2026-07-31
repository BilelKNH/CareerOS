import { Logger } from '@nestjs/common';
import { OfferSource } from '@prisma/client';
import { JobSource, RawOffer, SearchQuery } from '../job-source.interface';
import { detectTech } from '../tech-keywords';

const BASE = 'https://api.adzuna.com/v1/api/jobs';

// Map location hints to an Adzuna country code (default France).
export function resolveCountry(locations: string[]): string {
  const joined = locations.join(' ').toLowerCase();
  if (joined.includes('belgi')) return 'be';
  if (joined.includes('suisse') || joined.includes('switzerland')) return 'ch';
  return 'fr';
}

interface AdzunaJob {
  id?: string;
  title?: string;
  description?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
  contract_time?: string;
  created?: string;
  redirect_url?: string;
}

/**
 * Adzuna aggregator API — compliant access (app_id + app_key, no scraping) to a
 * broad pool of job boards. Enabled when credentials are configured.
 */
export class AdzunaSource implements JobSource {
  readonly source = OfferSource.adzuna;
  readonly enabled: boolean;
  private readonly logger = new Logger(AdzunaSource.name);

  constructor(
    private readonly appId?: string,
    private readonly appKey?: string,
  ) {
    this.enabled = Boolean(appId && appKey);
  }

  async search(query: SearchQuery): Promise<RawOffer[]> {
    if (!this.enabled) return [];
    const country = resolveCountry(query.locations);
    const where = query.locations.find((l) => !/remote|france|belgi|suisse/i.test(l)) ?? '';
    const radius = Math.min(Math.max(query.radiusKm ?? 0, 0), 200);
    const offers = new Map<string, RawOffer>();

    // With a city + radius, search that perimeter; otherwise national (the
    // matching engine ranks by location afterwards).
    for (const role of query.roles.slice(0, 5)) {
      const params = new URLSearchParams({
        app_id: this.appId!,
        app_key: this.appKey!,
        results_per_page: '50',
        what: role,
      });
      if (where && radius > 0) {
        params.set('where', where);
        params.set('distance', String(radius));
      }

      try {
        const res = await fetch(`${BASE}/${country}/search/1?${params}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          this.logger.warn(`Adzuna "${role}" -> ${res.status}`);
          continue;
        }
        const json = (await res.json()) as { results?: AdzunaJob[] };
        for (const j of json.results ?? []) {
          const mapped = this.map(j);
          offers.set(mapped.url, mapped);
        }
        await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        this.logger.warn(`Adzuna "${role}" error: ${(err as Error).message}`);
      }
    }
    this.logger.log(`Adzuna: ${offers.size} offres récupérées.`);
    return [...offers.values()];
  }

  private map(j: AdzunaJob): RawOffer {
    const tech = detectTech(`${j.title ?? ''} ${j.description ?? ''}`);
    const salary =
      j.salary_min || j.salary_max
        ? `${Math.round(j.salary_min ?? 0)}–${Math.round(j.salary_max ?? 0)} €`
        : undefined;
    const contractType = [j.contract_type, j.contract_time].filter(Boolean).join(' ') || undefined;

    return {
      source: this.source,
      externalId: j.id,
      url: j.redirect_url ?? `https://www.adzuna.fr/details/${j.id}`,
      title: j.title ?? 'Offre',
      company: j.company?.display_name,
      location: j.location?.display_name,
      salary,
      contractType,
      description: j.description,
      technologies: tech,
      requiredSkills: tech,
      publishedAt: j.created ? new Date(j.created) : undefined,
    };
  }
}
