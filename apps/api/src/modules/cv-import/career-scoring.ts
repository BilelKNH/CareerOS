import { normalizeSkill } from '../../common/utils/text.util';
import { METIERS_CATALOG } from './metiers-catalog';

export interface CareerRank {
  sector: string;
  role: string;
  score: number; // 0-100
  matched: string[];
  missing: string[];
}

/**
 * Cross-domain skills that appear in almost every job. On their own they
 * shouldn't make an unrelated sector "relevant" (e.g. having "Excel" shouldn't
 * surface Finance roles to a retail salesperson).
 */
const GENERIC_SKILLS = new Set(
  [
    'communication',
    'reporting',
    'excel',
    'organisation',
    'management',
    'leadership',
    'bureautique',
    'budget',
    'planification',
    'gestion administrative',
    'coordination',
  ].map(normalizeSkill),
);

/**
 * Rank the métiers catalog against a candidate skill set. Keeps only the
 * sectors RELATED to the candidate (at least one specific, non-generic match)
 * and only the roles that actually score ( > 0 ), best first.
 */
export function rankCareers(candidate: Set<string>): CareerRank[] {
  const scored = METIERS_CATALOG.map((m) => {
    const matched = m.skills.filter((s) => candidate.has(normalizeSkill(s)));
    const missing = m.skills.filter((s) => !candidate.has(normalizeSkill(s)));
    const specific = matched.filter((s) => !GENERIC_SKILLS.has(normalizeSkill(s)));
    const score = m.skills.length ? Math.round((matched.length / m.skills.length) * 100) : 0;
    return { sector: m.sector, role: m.role, score, matched, missing, specificCount: specific.length };
  });

  // A sector is relevant if any of its roles shares a specific skill with the CV.
  const relevantSectors = new Set(
    scored.filter((r) => r.specificCount >= 1).map((r) => r.sector),
  );

  // Only related sectors AND only roles that actually score, to stay light.
  let results = scored.filter((r) => relevantSectors.has(r.sector) && r.score > 0);
  // Fallback: nothing matched → surface the best partial fits rather than nothing.
  if (!results.length) results = scored.filter((r) => r.score > 0);

  results.sort((a, b) => b.score - a.score);
  return results.map(({ specificCount: _c, ...r }) => r);
}
