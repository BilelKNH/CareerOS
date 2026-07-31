import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma, ReportType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketAgentService } from '../ai-analysis/market-agent.service';
import { CoachAgentService } from '../ai-analysis/coach-agent.service';
import { NotificationsService } from '../notifications/notifications.service';

const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketAgentService,
    private readonly coach: CoachAgentService,
    private readonly notifications: NotificationsService,
  ) {}

  list(userId: string) {
    return this.prisma.report.findMany({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
      select: { id: true, type: true, periodStart: true, periodEnd: true, generatedAt: true },
    });
  }

  get(userId: string, id: string) {
    return this.prisma.report.findFirst({ where: { id, userId } });
  }

  async generate(userId: string, type: ReportType) {
    const now = new Date();
    const span = type === ReportType.weekly ? 7 * DAY : 30 * DAY;
    const periodStart = new Date(now.getTime() - span);

    const payload =
      type === ReportType.weekly
        ? await this.buildWeekly(userId, periodStart)
        : await this.buildMonthly(userId, periodStart);

    const report = await this.prisma.report.create({
      data: {
        userId,
        type,
        periodStart,
        periodEnd: now,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });

    await this.notifications.create(
      userId,
      NotificationType.report_ready,
      `Rapport ${type === ReportType.weekly ? 'hebdomadaire' : 'mensuel'} disponible`,
      undefined,
      { reportId: report.id },
    );

    return report;
  }

  private async buildWeekly(userId: string, since: Date) {
    const [newOffers, priorityMatches, market, coach] = await Promise.all([
      this.prisma.jobOffer.count({ where: { scrapedAt: { gte: since } } }),
      this.prisma.jobMatch.findMany({
        where: { userId, globalScore: { gte: 85 } },
        orderBy: { globalScore: 'desc' },
        take: 5,
        include: { jobOffer: { select: { title: true, company: true, url: true } } },
      }),
      this.market.analyze(userId),
      this.coach.plan(userId),
    ]);

    return {
      newOffers,
      priorityOffers: priorityMatches.map((m) => ({
        title: m.jobOffer.title,
        company: m.jobOffer.company,
        score: m.globalScore,
        url: m.jobOffer.url,
      })),
      topDemandedSkills: market.topRequiredSkills.slice(0, 8),
      recommendedActions: [coach.summary, ...coach.focusSkills.map((s) => `Progresser sur ${s}`)],
    };
  }

  private async buildMonthly(userId: string, since: Date) {
    const [snapshots, newSkills, skillCount, market, coach] = await Promise.all([
      this.prisma.memorySnapshot.count({ where: { userId, createdAt: { gte: since } } }),
      this.prisma.skill.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { name: true },
      }),
      this.prisma.skill.count({ where: { userId } }),
      this.market.analyze(userId),
      this.coach.plan(userId),
    ]);

    return {
      profileEvolution: { snapshotsThisMonth: snapshots, totalSkills: skillCount },
      newSkills: newSkills.map((s) => s.name),
      marketEvolution: {
        commentary: market.commentary ?? null,
        topTechnologies: market.topTechnologies.slice(0, 8),
        skillCoverage: market.skillCoverage,
      },
      salaryEvolution: { salary: market.salary, tjm: market.tjm },
      progressionTowardGoals: `${market.skillCoverage}% de couverture des compétences les plus demandées.`,
      nextMonthPlan: coach,
    };
  }
}
