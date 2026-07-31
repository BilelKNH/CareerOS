import { Injectable } from '@nestjs/common';
import { InterviewProbability, JobMatch, JobOffer, JobPreference } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeSkill } from '../../common/utils/text.util';

interface ScoreBundle {
  techScore: number;
  experienceScore: number;
  locationScore: number;
  salaryScore: number;
  seniorityScore: number;
  contractScore: number;
  globalScore: number;
  strengths: string[];
  missingSkills: string[];
  missingTechnologies: string[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const firstNumber = (s?: string | null): number | null => {
  if (!s) return null;
  const m = s.replace(/\s/g, '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
};

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Recompute matches for every offer for a user. */
  async matchAllForUser(userId: string) {
    const offers = await this.prisma.jobOffer.findMany();
    const results: JobMatch[] = [];
    for (const offer of offers) {
      results.push(await this.matchOffer(userId, offer));
    }
    return results;
  }

  async matchOfferById(userId: string, offerId: string) {
    const offer = await this.prisma.jobOffer.findUniqueOrThrow({ where: { id: offerId } });
    return this.matchOffer(userId, offer);
  }

  private async matchOffer(userId: string, offer: JobOffer) {
    const [skills, user, prefs] = await Promise.all([
      this.prisma.skill.findMany({ where: { userId }, select: { name: true, normalizedName: true } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { yearsExperience: true } }),
      this.prisma.jobPreference.findUnique({ where: { userId } }),
    ]);

    const userSkillSet = new Set(skills.map((s) => s.normalizedName));
    const years = Number(user.yearsExperience);
    const bundle = this.score(offer, userSkillSet, years, prefs);

    const interviewProbability =
      bundle.globalScore >= 85
        ? InterviewProbability.elevee
        : bundle.globalScore >= 65
          ? InterviewProbability.moyenne
          : InterviewProbability.faible;

    const recommendations = this.recommend(bundle, interviewProbability);

    return this.prisma.jobMatch.upsert({
      where: { userId_jobOfferId: { userId, jobOfferId: offer.id } },
      create: {
        userId,
        jobOfferId: offer.id,
        ...bundle,
        interviewProbability,
        salaryEstimate: offer.tjm ?? offer.salary ?? null,
        readinessDays: bundle.missingSkills.length * 20,
        recommendations,
      },
      update: {
        ...bundle,
        interviewProbability,
        readinessDays: bundle.missingSkills.length * 20,
        recommendations,
      },
    });
  }

  /** Deterministic, transparent multi-criteria scoring. */
  private score(
    offer: JobOffer,
    userSkills: Set<string>,
    years: number,
    prefs: JobPreference | null,
  ): ScoreBundle {
    // --- ATS keyword overlap (technical) ---
    const required = [...new Set([...offer.requiredSkills, ...offer.technologies])];
    const matched = required.filter((r) => userSkills.has(normalizeSkill(r)));
    const missing = required.filter((r) => !userSkills.has(normalizeSkill(r)));
    const techScore = required.length ? (matched.length / required.length) * 100 : 100;

    // --- Experience vs implied seniority ---
    const title = offer.title.toLowerCase();
    const targetYears = /lead|senior|principal/.test(title) ? 5 : /junior/.test(title) ? 1 : 3;
    const experienceScore = clamp((years / targetYears) * 100);
    const seniorityScore = years >= targetYears ? 100 : clamp((years / targetYears) * 100 * 0.9);

    // --- Location ---
    const locations = (prefs?.locations ?? []).map((l) => l.toLowerCase());
    const remoteOk = prefs?.remote === 'remote';
    const offerLoc = (offer.location ?? '').toLowerCase();
    const locationScore =
      remoteOk || locations.length === 0 || locations.some((l) => offerLoc.includes(l) || l.includes(offerLoc))
        ? 100
        : 45;

    // --- Salary / TJM ---
    const value = firstNumber(offer.tjm) ?? firstNumber(offer.salary);
    const min = offer.tjm ? prefs?.tjmMin : prefs?.salaryMin;
    const max = offer.tjm ? prefs?.tjmMax : prefs?.salaryMax;
    let salaryScore = 70; // neutral if unknown
    if (value != null && min != null && max != null) {
      salaryScore = value >= min && value <= max ? 100 : value < min ? 55 : 85;
    }

    // --- Contract ---
    const contractTypes = (prefs?.contractTypes ?? []).map((c) => c.toLowerCase());
    const contractScore = !contractTypes.length
      ? 70
      : contractTypes.includes((offer.contractType ?? '').toLowerCase())
        ? 100
        : 50;

    const globalScore = clamp(
      techScore * 0.4 +
        experienceScore * 0.2 +
        locationScore * 0.15 +
        salaryScore * 0.1 +
        seniorityScore * 0.1 +
        contractScore * 0.05,
    );

    return {
      techScore: clamp(techScore),
      experienceScore: clamp(experienceScore),
      locationScore: clamp(locationScore),
      salaryScore: clamp(salaryScore),
      seniorityScore: clamp(seniorityScore),
      contractScore: clamp(contractScore),
      globalScore,
      strengths: matched,
      missingSkills: missing,
      missingTechnologies: offer.technologies.filter((t) => !userSkills.has(normalizeSkill(t))),
    };
  }

  private recommend(bundle: ScoreBundle, prob: InterviewProbability): string {
    if (bundle.missingSkills.length === 0) {
      return 'Excellent alignement — postule dès maintenant.';
    }
    const gaps = bundle.missingSkills.slice(0, 3).join(', ');
    if (prob === InterviewProbability.elevee) {
      return `Postule après avoir mis en avant : ${gaps}. Ajoute une preuve concrète (projet/CI-CD) au CV.`;
    }
    return `Comble d'abord : ${gaps}. Vise un projet GitHub ou une certification avant de postuler.`;
  }
}
