import { Logger } from '@nestjs/common';
import { OfferSource } from '@prisma/client';
import { JobSource, RawOffer, SearchQuery } from '../job-source.interface';

/**
 * Base class for sources that scrape JavaScript-rendered sites with Playwright.
 *
 * Playwright is imported lazily so the API boots even when browsers aren't
 * installed (run `npx playwright install chromium` to enable). Subclasses
 * implement `parse()` for a single search page.
 *
 * COMPLIANCE: throttle between requests, honor robots.txt, respect each site's
 * Terms of Service, and prefer official APIs where they exist.
 */
export abstract class PlaywrightJobSource implements JobSource {
  abstract readonly source: OfferSource;
  readonly enabled: boolean = false; // opt-in per source
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly throttleMs = 2000;

  /** Build the search URL for a given query. */
  protected abstract buildUrl(query: SearchQuery): string;

  /** Extract offers from a rendered page's HTML/DOM text. */
  protected abstract parse(pageText: string, query: SearchQuery): RawOffer[];

  async search(query: SearchQuery): Promise<RawOffer[]> {
    if (!this.enabled) return [];
    let browser: unknown;
    try {
      // Lazy import keeps Playwright optional.
      const { chromium } = (await import('playwright')) as typeof import('playwright');
      browser = await chromium.launch({ headless: true });
      const b = browser as import('playwright').Browser;
      const page = await b.newPage({ userAgent: 'ReasBot/0.1 (+contact)' });
      await page.goto(this.buildUrl(query), { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(this.throttleMs);
      const text = await page.content();
      return this.parse(text, query);
    } catch (err) {
      this.logger.warn(`Scraping ${this.source} failed: ${(err as Error).message}`);
      return [];
    } finally {
      if (browser) await (browser as import('playwright').Browser).close();
    }
  }
}
