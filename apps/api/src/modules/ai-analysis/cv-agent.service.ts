import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from './llm.service';
import { ProfileContextService } from './profile-context.service';
import { CV_AGENT_SYSTEM } from './prompts/agent-prompts';

export interface CvOutput {
  cvSummary: string;
  linkedinHeadline: string;
  linkedinAbout: string;
  maltPitch: string;
  coverLetter: string;
  atsKeywords: string[];
  method: 'llm' | 'template';
}

@Injectable()
export class CvAgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly context: ProfileContextService,
  ) {}

  async adapt(userId: string, offerId?: string): Promise<CvOutput> {
    const ctx = await this.context.build(userId);
    const offer = offerId
      ? await this.prisma.jobOffer.findUnique({ where: { id: offerId } })
      : null;

    if (this.llm.available) {
      const user = [
        `PROFIL:\n${this.context.toText(ctx)}`,
        offer
          ? `\nOFFRE CIBLE:\n${offer.title} @ ${offer.company}\nCompétences requises: ${[...offer.requiredSkills, ...offer.technologies].join(', ')}\n${offer.description ?? ''}`
          : '\nPas d’offre cible : optimise pour les rôles visés.',
      ].join('\n');

      const parsed = await this.llm.completeJson<Omit<CvOutput, 'method'>>(CV_AGENT_SYSTEM, user, 1500);
      if (parsed) return { ...parsed, method: 'llm' };
    }
    return this.template(ctx, offer);
  }

  private template(
    ctx: Awaited<ReturnType<ProfileContextService['build']>>,
    offer: { title: string; company: string | null; requiredSkills: string[]; technologies: string[] } | null,
  ): CvOutput {
    const topSkills = ctx.skills.slice(0, 8).map((s) => s.name);
    const role = offer?.title ?? ctx.targetRoles[0] ?? ctx.headline ?? 'Ingénieur QA';
    const atsKeywords = offer
      ? [...new Set([...offer.requiredSkills, ...offer.technologies])]
      : topSkills;

    return {
      cvSummary: `${ctx.headline ?? role} avec ${ctx.yearsExperience} ans d'expérience. Spécialisé en ${topSkills.slice(0, 4).join(', ')}. Orienté qualité, automatisation et CI/CD.`,
      linkedinHeadline: `${role} · ${topSkills.slice(0, 3).join(' · ')}`,
      linkedinAbout: `Ingénieur avec ${ctx.yearsExperience} ans d'expérience, je conçois des stratégies de test automatisé fiables. Compétences clés : ${topSkills.join(', ')}.`,
      maltPitch: `Freelance ${role} — ${ctx.yearsExperience} ans d'expérience. J'aide les équipes à automatiser leurs tests (${topSkills.slice(0, 4).join(', ')}) et à fiabiliser leurs pipelines CI/CD.`,
      coverLetter: offer
        ? `Madame, Monsieur,\n\nLe poste de ${offer.title} chez ${offer.company ?? 'votre entreprise'} correspond à mon expertise en ${topSkills.slice(0, 3).join(', ')}. Fort de ${ctx.yearsExperience} ans d'expérience, je suis convaincu de pouvoir contribuer rapidement.\n\nCordialement.`
        : `Lettre générique — fournissez une offre cible pour une version adaptée.`,
      atsKeywords,
      method: 'template',
    };
  }
}
