import { OfferSource } from '@prisma/client';

/** A normalized job offer as returned by any source before persistence. */
export interface RawOffer {
  source: OfferSource;
  externalId?: string;
  url: string;
  title: string;
  company?: string;
  location?: string;
  salary?: string;
  tjm?: string;
  contractType?: string;
  description?: string;
  technologies: string[];
  requiredSkills: string[];
  contactEmail?: string;
  publishedAt?: Date;
}

/** Search parameters passed to every source. */
export interface SearchQuery {
  roles: string[];
  locations: string[];
  keywords: string[];
  /** Radius in km around the primary location (0 = national / no radius). */
  radiusKm?: number;
}

/**
 * Contract every job source implements. New sources (LinkedIn, Indeed, WTTJ…)
 * plug in without touching the pipeline — just register them in ScrapingService.
 *
 * Implementations MUST respect each site's Terms of Service and robots.txt,
 * throttle requests, and prefer official APIs when available.
 */
export interface JobSource {
  readonly source: OfferSource;
  readonly enabled: boolean;
  search(query: SearchQuery): Promise<RawOffer[]>;
}
