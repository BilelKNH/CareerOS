import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from './llm.service';
import { ProfileContextService } from './profile-context.service';
import { normalizeSkill } from '../../common/utils/text.util';
import { MARKET_AGENT_SYSTEM } from './prompts/agent-prompts';

export interface MarketAnalysis {
  totalOffers: number;
  topTechnologies: { name: string; count: number }[];
  topRequiredSkills: { name: string; count: number }[];
  salary: { min: number; median: number; max: number } | null;
  tjm: { min: number; median: number; max: number } | null;
  byContract: Record<string, number>;
  skillCoverage: number; // % of top-10 demanded skills the user has
  missingInDemand: string[];
  commentary?: string;
  opportunities?: string[];
  risks?: string[];
}

const numbersIn = (s?: string | null): number[] =>
  (s?.match(/\d+/g) ?? []).map(Number).filter((n) => n > 3); // drop tiny numbers (e.g. "35h")

function stats(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    median: sorted[Math.floor(sorted.length / 2)],
    max: sorted[sorted.length - 1],
  };
}

function tally(items: string[]): { name: string; count: number }[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const raw of items) {
    const key = raw.toLowerCase();
    const entry = map.get(key) ?? { name: raw, count: 0 };
    entry.count += 1;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

@Injectable()
export class MarketAgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly context: ProfileContextService,
  ) {}

  async analyze(userId: string): Promise<MarketAnalysis> {
    const [offers, ctx] = await Promise.all([
      this.prisma.jobOffer.findMany(),
      this.context.build(userId),
    ]);

    const topTechnologies = tally(offers.flatMap((o) => o.technologies)).slice(0, 10);
    const topRequiredSkills = tally(offers.flatMap((o) => o.requiredSkills)).slice(0, 10);
    const salaryValues = offers.flatMap((o) => numbersIn(o.salary));
    const tjmValues = offers.flatMap((o) => numbersIn(o.tjm));

    const byContract: Record<string, number> = {};
    for (const o of offers) {
      const key = o.contractType ?? 'N/A';
      byContract[key] = (byContract[key] ?? 0) + 1;
    }

    const userSkills = new Set(ctx.skills.map((s) => normalizeSkill(s.name)));
    const top10 = topRequiredSkills.slice(0, 10);
    const covered = top10.filter((s) => userSkills.has(normalizeSkill(s.name))).length;
    const skillCoverage = top10.length ? Math.round((covered / top10.length) * 100) : 0;
    const missingInDemand = top10
      .filter((s) => !userSkills.has(normalizeSkill(s.name)))
      .map((s) => s.name);

    const analysis: MarketAnalysis = {
      totalOffers: offers.length,
      topTechnologies,
      topRequiredSkills,
      salary: stats(salaryValues),
      tjm: stats(tjmValues),
      byContract,
      skillCoverage,
      missingInDemand,
    };

    if (this.llm.available && offers.length) {
      const user = `STATS MARCHÉ:\n${JSON.stringify({
        topTechnologies,
        topRequiredSkills,
        salary: analysis.salary,
        tjm: analysis.tjm,
      })}\n\nPROFIL:\n${this.context.toText(ctx)}`;
      const parsed = await this.llm.completeJson<{
        commentary: string;
        opportunities: string[];
        risks: string[];
      }>(MARKET_AGENT_SYSTEM, user, 800);
      if (parsed) Object.assign(analysis, parsed);
    }

    return analysis;
  }
}
