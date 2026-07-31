import { normalizeSkill } from '../../common/utils/text.util';

/** Placeholder stored when a CV experience has no identifiable company. */
export const COMPANY_FALLBACK = 'N/A';

/**
 * Stable identity key for an experience, used to dedupe on (re)import.
 * Empty / missing / "N/A" companies are all treated the same, so an experience
 * stored with company="N/A" matches a freshly-extracted one with company="".
 */
export function experienceKey(title: string, company?: string | null): string {
  const c = normalizeSkill(company ?? '');
  const normalizedCompany = c === '' || c === normalizeSkill(COMPANY_FALLBACK) ? '' : c;
  return `${normalizeSkill(title)}|${normalizedCompany}`;
}
