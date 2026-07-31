import { resolveDepartement, resolveCommune } from './france-travail.source';
import { resolveCountry } from './adzuna.source';
import { detectTech } from '../tech-keywords';
import { SampleJobSource } from './sample.source';

describe('scraping source helpers', () => {
  it('maps locations to INSEE department codes', () => {
    expect(resolveDepartement(['Lille'])).toBe('59');
    expect(resolveDepartement(['Paris'])).toBe('75');
    expect(resolveDepartement(['Remote'])).toBeNull();
  });

  it('maps cities to INSEE commune codes', () => {
    expect(resolveCommune(['Lille'])).toBe('59350');
    expect(resolveCommune(['Nulle part'])).toBeNull();
  });

  it('resolves Adzuna country from location hints', () => {
    expect(resolveCountry(['Belgique'])).toBe('be');
    expect(resolveCountry(['Lille', 'France'])).toBe('fr');
  });

  it('detects tech keywords in free text', () => {
    const tech = detectTech('Pipeline GitHub Actions avec Playwright, TypeScript et AWS');
    expect(tech).toEqual(expect.arrayContaining(['GitHub Actions', 'Playwright', 'TypeScript', 'AWS']));
  });
});

describe('SampleJobSource', () => {
  it('is disabled when a real source is active', () => {
    expect(new SampleJobSource(false).enabled).toBe(false);
    expect(new SampleJobSource(true).enabled).toBe(true);
  });

  it('returns deterministic sample offers', async () => {
    const offers = await new SampleJobSource().search({ roles: ['SDET'], locations: ['Lille'], keywords: [] });
    expect(offers.length).toBeGreaterThan(0);
    expect(offers[0].source).toBe('sample');
    expect(offers.every((o) => o.title && o.url)).toBe(true);
  });
});
