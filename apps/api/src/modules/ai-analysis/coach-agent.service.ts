import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from './llm.service';
import { ProfileContextService } from './profile-context.service';
import { COACH_AGENT_SYSTEM } from './prompts/agent-prompts';

export interface CoachPlan {
  focusSkills: string[];
  certifications: string[];
  projectIdeas: string[];
  interviewPrep: string[];
  summary: string;
  method: 'llm' | 'rules';
}

/** Recommendation map: demanded skill -> certification & project idea. */
const RECO: Record<string, { cert?: string; project?: string }> = {
  aws: { cert: 'AWS Certified Cloud Practitioner', project: 'CI/CD de tests sur AWS (CodeBuild + Playwright)' },
  terraform: { cert: 'HashiCorp Terraform Associate', project: 'Provisionner un env de test éphémère en Terraform' },
  kubernetes: { cert: 'CKAD', project: 'Déployer une suite de tests dans un cluster k8s' },
  docker: { project: 'Conteneuriser un runner de tests Playwright' },
  'ci/cd': { project: 'Pipeline GitHub Actions matriciel (multi-navigateurs)' },
  playwright: { project: 'Framework de test Playwright réutilisable (fixtures + reporting)' },
  cypress: { project: 'Migration d’une suite Cypress vers Playwright' },
  python: { cert: 'PCEP', project: 'Outils de test data-driven en Python' },
};

@Injectable()
export class CoachAgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly context: ProfileContextService,
  ) {}

  async plan(userId: string): Promise<CoachPlan> {
    const [matches, ctx] = await Promise.all([
      this.prisma.jobMatch.findMany({ where: { userId }, select: { missingSkills: true } }),
      this.context.build(userId),
    ]);

    // Rank gaps by how often they appear across matched offers.
    const freq = new Map<string, number>();
    for (const m of matches) {
      for (const s of m.missingSkills) freq.set(s, (freq.get(s) ?? 0) + 1);
    }
    const focusSkills = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => s)
      .slice(0, 5);

    const certifications = [
      ...new Set(focusSkills.map((s) => RECO[s.toLowerCase()]?.cert).filter(Boolean) as string[]),
    ];
    const projectIdeas = [
      ...new Set(focusSkills.map((s) => RECO[s.toLowerCase()]?.project).filter(Boolean) as string[]),
    ];

    const rulesPlan: CoachPlan = {
      focusSkills,
      certifications,
      projectIdeas,
      interviewPrep: this.interviewPrep(ctx.skills.map((s) => s.name)),
      summary: focusSkills.length
        ? `Priorise ${focusSkills.slice(0, 3).join(', ')} — ce sont les écarts les plus fréquents face au marché.`
        : 'Profil bien aligné : consolide tes acquis et vise une certification cloud.',
      method: 'rules',
    };

    if (this.llm.available) {
      const user = `PROFIL:\n${this.context.toText(ctx)}\n\nCOMPÉTENCES MANQUANTES LES PLUS FRÉQUENTES: ${focusSkills.join(', ') || 'aucune'}`;
      const parsed = await this.llm.completeJson<Omit<CoachPlan, 'method'>>(
        COACH_AGENT_SYSTEM,
        user,
        900,
      );
      if (parsed) return { ...parsed, method: 'llm' };
    }
    return rulesPlan;
  }

  private interviewPrep(skills: string[]): string[] {
    const base = [
      'Explique ta stratégie de test end-to-end sur un projet récent.',
      'Comment structures-tu un pipeline CI/CD pour des tests fiables et rapides ?',
      'Comment gères-tu la flakiness des tests automatisés ?',
    ];
    if (skills.some((s) => /playwright/i.test(s))) {
      base.push('Compare Playwright et Selenium : quand choisir l’un ou l’autre ?');
    }
    return base;
  }
}
