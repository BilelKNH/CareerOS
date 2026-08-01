import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MemoryAgentService } from '../ai-analysis/memory-agent.service';
import { normalizeSkill } from '../../common/utils/text.util';
import { rankCareers } from './career-scoring';

export interface Stats {
  min: number;
  median: number;
  max: number;
}

const numbersIn = (s?: string | null): number[] =>
  (s?.match(/\d+/g) ?? []).map(Number).filter((n) => n > 3);

function stats(values: number[]): Stats | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], max: sorted[sorted.length - 1] };
}

function tally(items: string[]): { name: string; count: number }[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const raw of items) {
    const key = raw.toLowerCase();
    const e = map.get(key) ?? { name: raw, count: 0 };
    e.count += 1;
    map.set(key, e);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

@Injectable()
export class CvMatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryAgent: MemoryAgentService,
  ) {}

  /**
   * Resolve the candidate's skill set — from pasted CV text (explicit) or, by
   * default, the saved profile. The general explorer reflects the PROFILE; the
   * per-CV scoring shown right after an import is computed separately at import
   * time (see CvImportService) so the two stay distinct.
   */
  private async candidateSkills(userId: string, cvText?: string): Promise<Set<string>> {
    if (cvText && cvText.trim().length > 20) {
      const ex = await this.memoryAgent.extract(cvText);
      return new Set(ex.skills.map((s) => normalizeSkill(s.name)));
    }
    const skills = await this.prisma.skill.findMany({
      where: { userId },
      select: { normalizedName: true },
    });
    return new Set(skills.map((s) => s.normalizedName));
  }

  /**
   * Score the candidate against the MARKET demand for a given role: aggregate
   * the skills demanded by offers for that role and measure coverage.
   */
  async scoreByRole(userId: string, role: string, cvText?: string) {
    if (!role || !role.trim()) throw new BadRequestException('Rôle requis.');
    const candidate = await this.candidateSkills(userId, cvText);

    const offers = await this.prisma.jobOffer.findMany();
    const tokens = role.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const relevant = offers.filter((o) => {
      const hay = `${o.title} ${o.description ?? ''}`.toLowerCase();
      return tokens.some((t) => hay.includes(t));
    });
    const pool = relevant.length ? relevant : offers;

    const demand = tally(pool.flatMap((o) => [...o.requiredSkills, ...o.technologies])).slice(0, 12);
    const demanded = demand.map((d) => ({
      name: d.name,
      count: d.count,
      have: candidate.has(normalizeSkill(d.name)),
    }));
    const have = demanded.filter((d) => d.have).length;
    const coverage = demanded.length ? Math.round((have / demanded.length) * 100) : 0;
    const missingSkills = demanded.filter((d) => !d.have).map((d) => d.name);

    return {
      role,
      roleScore: coverage,
      coverage,
      offerCount: pool.length,
      matchedOnRole: relevant.length > 0,
      demanded,
      missingSkills,
      marketSalary: stats(pool.flatMap((o) => numbersIn(o.salary))),
      marketTjm: stats(pool.flatMap((o) => numbersIn(o.tjm))),
      recommendations: missingSkills.slice(0, 4).map((s) => `Acquérir / mettre en avant ${s}`),
    };
  }

  /**
   * Explore a catalog of métiers, but only the ones RELATED to the candidate's
   * CV. We score every métier, then keep only the sectors where the candidate
   * has at least one *specific* (non-generic) matching skill — so a tech CV
   * surfaces tech roles, a sales CV surfaces sales/retail roles, etc.
   * Generic office skills (Excel, Communication…) alone don't pull a whole
   * unrelated sector into view.
   */
  async exploreCareers(userId: string, cvText?: string) {
    const candidate = await this.candidateSkills(userId, cvText);
    return rankCareers(candidate);
  }

  /**
   * Score the match between the candidate (CV or profile) and a specific job:
   * either a stored offer (offerId) or a pasted job ad (jobText).
   */
  async matchOffer(userId: string, params: { offerId?: string; jobText?: string; cvText?: string }) {
    const candidate = await this.candidateSkills(userId, params.cvText);

    let required: string[];
    let title: string;
    if (params.offerId) {
      const o = await this.prisma.jobOffer.findUniqueOrThrow({ where: { id: params.offerId } });
      required = [...new Set([...o.requiredSkills, ...o.technologies])];
      title = o.title;
    } else if (params.jobText && params.jobText.trim().length > 20) {
      const ex = await this.memoryAgent.extract(params.jobText);
      required = [...new Set([...ex.skills.map((s) => s.name), ...ex.technologies])];
      title = 'Annonce collée';
    } else {
      throw new BadRequestException('Fournis un offerId ou le texte d’une annonce (jobText).');
    }

    const matched = required.filter((r) => candidate.has(normalizeSkill(r)));
    const missing = required.filter((r) => !candidate.has(normalizeSkill(r)));
    const matchScore = required.length ? Math.round((matched.length / required.length) * 100) : 0;
    const interviewProbability = matchScore >= 85 ? 'élevée' : matchScore >= 65 ? 'moyenne' : 'faible';
    const recommendation = missing.length
      ? `Comble en priorité : ${missing.slice(0, 3).join(', ')}.`
      : 'Excellent alignement — postule dès maintenant.';

    return {
      title,
      matchScore,
      matched,
      missingSkills: missing,
      atsKeywords: required,
      interviewProbability,
      recommendation,
    };
  }

  /**
   * Fetch a job posting from its URL (server-side), strip the HTML to text,
   * and run the same match analysis. Falls back to a clear error so the UI can
   * ask the user to paste the text instead.
   */
  async matchOfferFromUrl(userId: string, url: string) {
    if (!/^https?:\/\//i.test(url || '')) {
      throw new BadRequestException('URL invalide — elle doit commencer par http(s)://');
    }
    let text = '';
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; ReasBot/1.0)' } });
      const html = await res.text();
      text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      throw new BadRequestException('Impossible de récupérer cette URL. Colle le texte de l’offre à la place.');
    }
    if (text.length < 120) {
      throw new BadRequestException('Contenu de l’offre introuvable à cette URL (page protégée ?). Colle le texte à la place.');
    }
    const result = await this.matchOffer(userId, { jobText: text.slice(0, 9000) });
    return { ...result, source: 'url' as const };
  }
}
