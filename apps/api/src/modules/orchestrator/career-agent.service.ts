import { Injectable, Logger } from '@nestjs/common';
import { AgentStatus, AgentTrigger, MemoryKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ScrapingService } from '../scraping/scraping.service';
import { MatchingService } from '../job-search/matching.service';
import { MarketAgentService } from '../ai-analysis/market-agent.service';
import { CoachAgentService } from '../ai-analysis/coach-agent.service';
import { CvAgentService } from '../ai-analysis/cv-agent.service';
import { LlmService } from '../ai-analysis/llm.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserService } from '../user/user.service';
import { CareerMemoryService } from '../career-memory/career-memory.service';
import { ApplicationsService, AutoApplyResult } from '../applications/applications.service';
import { PLANNER_SYSTEM, buildPlannerPrompt } from './prompts/planner.prompt';

export interface AgentAction {
  type: 'apply' | 'learn' | 'update_cv' | 'network' | 'review';
  label: string;
  detail?: string;
  requiresConfirmation: boolean;
  done?: boolean;
}

export interface AgentDigest {
  narrative: string;
  employabilityScore: number;
  scoreDelta: number;
  topMatches: { offerId: string; title: string; company: string | null; score: number }[];
  marketHighlights: { skillCoverage: number; missingInDemand: string[]; topTechnologies: string[] };
  cvDrafts: { offerId: string; title: string; cvSummary: string; atsKeywords: string[] }[];
  applications: AutoApplyResult;
  recommendedActions: AgentAction[];
  method: 'llm' | 'rules';
}

const HIGH = 85;

@Injectable()
export class CareerAgentService {
  private readonly logger = new Logger(CareerAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraping: ScrapingService,
    private readonly matching: MatchingService,
    private readonly market: MarketAgentService,
    private readonly coach: CoachAgentService,
    private readonly cv: CvAgentService,
    private readonly llm: LlmService,
    private readonly notifications: NotificationsService,
    private readonly users: UserService,
    private readonly memory: CareerMemoryService,
    private readonly applications: ApplicationsService,
  ) {}

  listRuns(userId: string) {
    return this.prisma.agentRun.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 30,
      select: { id: true, trigger: true, status: true, startedAt: true, finishedAt: true, metrics: true },
    });
  }

  getRun(userId: string, id: string) {
    return this.prisma.agentRun.findFirst({ where: { id, userId } });
  }

  latestDigest(userId: string) {
    return this.prisma.agentRun.findFirst({
      where: { userId, status: AgentStatus.completed },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * One full autonomous cycle. Safe internal actions are executed immediately;
   * external actions are returned as recommendations requiring confirmation.
   */
  async runCycle(userId: string, trigger: AgentTrigger = AgentTrigger.scheduled) {
    const run = await this.prisma.agentRun.create({
      data: { userId, trigger, status: AgentStatus.running },
    });

    try {
      const before = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { employabilityScore: true },
      });

      // 1. Perceive: gather fresh offers, then reason about fit.
      const inserted = await this.scraping.run(userId);
      await this.matching.matchAllForUser(userId);

      // 2. Act (internal, safe): keep the score and alerts current.
      const scoreAfter = await this.users.recomputeEmployabilityScore(userId);
      const notified = await this.notifications.notifyHighMatches(userId);

      // 3. Analyze: market + coaching.
      const [market, coach, topMatches] = await Promise.all([
        this.market.analyze(userId),
        this.coach.plan(userId),
        this.prisma.jobMatch.findMany({
          where: { userId, globalScore: { gte: HIGH } },
          orderBy: { globalScore: 'desc' },
          take: 3,
          include: { jobOffer: { select: { id: true, title: true, company: true } } },
        }),
      ]);

      // 4. Act (internal, safe): pre-draft CVs for the very best matches.
      const cvDrafts: AgentDigest['cvDrafts'] = [];
      for (const m of topMatches.slice(0, 2)) {
        const out = await this.cv.adapt(userId, m.jobOfferId);
        cvDrafts.push({
          offerId: m.jobOfferId,
          title: m.jobOffer.title,
          cvSummary: out.cvSummary,
          atsKeywords: out.atsKeywords,
        });
      }

      // 5. Act (guarded): prepare application packages for the best matches.
      //    Auto-submits only if the user opted in AND cleared their threshold.
      const autoApply = await this.applications.autoApplyForUser(userId);

      const scoreDelta = scoreAfter - before.employabilityScore;
      const state = {
        employabilityScore: scoreAfter,
        scoreDelta,
        newOffers: inserted.length,
        applications: autoApply,
        topMatches: topMatches.map((m) => ({
          title: m.jobOffer.title,
          company: m.jobOffer.company,
          score: m.globalScore,
          missingSkills: m.missingSkills,
          recommendation: m.recommendations,
        })),
        market: {
          skillCoverage: market.skillCoverage,
          missingInDemand: market.missingInDemand,
          topTechnologies: market.topTechnologies.map((t) => t.name),
        },
        coach: { focusSkills: coach.focusSkills, summary: coach.summary },
      };

      const { narrative, recommendedActions, method } = await this.plan(state, {
        scoreDelta,
        topMatches,
        coach,
        market,
        cvDrafts,
        autoApply,
      });

      const digest: AgentDigest = {
        narrative,
        employabilityScore: scoreAfter,
        scoreDelta,
        topMatches: topMatches.map((m) => ({
          offerId: m.jobOffer.id,
          title: m.jobOffer.title,
          company: m.jobOffer.company,
          score: m.globalScore,
        })),
        marketHighlights: {
          skillCoverage: market.skillCoverage,
          missingInDemand: market.missingInDemand,
          topTechnologies: market.topTechnologies.slice(0, 6).map((t) => t.name),
        },
        cvDrafts,
        applications: autoApply,
        recommendedActions,
        method,
      };

      // Remember this analysis so future cycles have continuity.
      await this.memory.addMemory(userId, MemoryKind.analysis, narrative, {
        source: 'career_agent',
        scoreAfter,
      });

      const metrics = {
        newOffers: inserted.length,
        highMatches: topMatches.length,
        notifications: notified.length,
        scoreBefore: before.employabilityScore,
        scoreAfter,
      };

      const finished = await this.prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: AgentStatus.completed,
          finishedAt: new Date(),
          metrics: metrics as unknown as Prisma.InputJsonValue,
          digest: digest as unknown as Prisma.InputJsonValue,
        },
      });

      this.logger.log(
        `Agent cycle for ${userId}: +${inserted.length} offers, ${topMatches.length} high matches, score ${scoreAfter}.`,
      );
      return finished;
    } catch (err) {
      this.logger.error(`Agent cycle failed for ${userId}: ${(err as Error).message}`);
      return this.prisma.agentRun.update({
        where: { id: run.id },
        data: { status: AgentStatus.failed, finishedAt: new Date(), error: (err as Error).message },
      });
    }
  }

  /** Plan the narrative + actions (LLM when available, deterministic otherwise). */
  private async plan(
    state: unknown,
    ctx: {
      scoreDelta: number;
      topMatches: { jobOffer: { id: string; title: string }; globalScore: number; recommendations: string | null }[];
      coach: { focusSkills: string[]; summary: string };
      market: { missingInDemand: string[] };
      cvDrafts: AgentDigest['cvDrafts'];
      autoApply: AutoApplyResult;
    },
  ): Promise<{ narrative: string; recommendedActions: AgentAction[]; method: 'llm' | 'rules' }> {
    if (this.llm.available) {
      const parsed = await this.llm.completeJson<{
        narrative: string;
        recommendedActions: AgentAction[];
      }>(PLANNER_SYSTEM, buildPlannerPrompt(state), 1000);
      if (parsed?.narrative) {
        // Force safety: any 'apply'/'network' action must require confirmation.
        const actions = (parsed.recommendedActions ?? []).map((a) => ({
          ...a,
          requiresConfirmation: a.type === 'apply' || a.type === 'network' ? true : a.requiresConfirmation,
        }));
        return { narrative: parsed.narrative, recommendedActions: actions, method: 'llm' };
      }
    }
    return { ...this.rulesPlan(ctx), method: 'rules' as const };
  }

  private rulesPlan(ctx: {
    scoreDelta: number;
    topMatches: { jobOffer: { id: string; title: string }; globalScore: number; recommendations: string | null }[];
    coach: { focusSkills: string[]; summary: string };
    market: { missingInDemand: string[] };
    cvDrafts: AgentDigest['cvDrafts'];
    autoApply: AutoApplyResult;
  }) {
    const actions: AgentAction[] = [];

    for (const draft of ctx.cvDrafts) {
      actions.push({
        type: 'update_cv',
        label: `CV adapté généré pour « ${draft.title} »`,
        detail: 'Brouillon prêt à relire dans le détail de l’offre.',
        requiresConfirmation: false,
        done: true,
      });
    }

    if (ctx.autoApply.submitted > 0) {
      actions.push({
        type: 'apply',
        label: `${ctx.autoApply.submitted} candidature(s) envoyée(s) automatiquement`,
        detail: 'Auto-candidature activée au-dessus de ton seuil.',
        requiresConfirmation: false,
        done: true,
      });
    }
    if (ctx.autoApply.pendingReview > 0) {
      actions.push({
        type: 'apply',
        label: `${ctx.autoApply.pendingReview} candidature(s) prête(s) à valider`,
        detail: 'Dossiers générés (CV + lettre) — relis puis approuve pour envoyer.',
        requiresConfirmation: true,
      });
    }
    for (const skill of ctx.coach.focusSkills.slice(0, 3)) {
      actions.push({
        type: 'learn',
        label: `Progresser sur ${skill}`,
        detail: 'Écart fréquent face aux offres visées.',
        requiresConfirmation: false,
      });
    }

    const delta =
      ctx.scoreDelta > 0
        ? `Ton score d’employabilité a gagné ${ctx.scoreDelta} points. `
        : ctx.scoreDelta < 0
          ? `Ton score a baissé de ${Math.abs(ctx.scoreDelta)} points. `
          : '';
    const narrative =
      `${delta}J’ai analysé le marché et tes meilleures offres du jour. ` +
      (ctx.topMatches.length
        ? `${ctx.topMatches.length} offre(s) dépassent 85 % — j’ai préparé les CV correspondants. `
        : 'Aucune offre au-dessus de 85 % aujourd’hui. ') +
      (ctx.coach.focusSkills.length
        ? `Priorité d’apprentissage : ${ctx.coach.focusSkills.slice(0, 3).join(', ')}.`
        : ctx.coach.summary);

    return { narrative, recommendedActions: actions };
  }
}
