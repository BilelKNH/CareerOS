import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const INTERESTING = 70;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Job-search tracker: funnel of offers/applications + a follow-up list. */
  async getOverview(userId: string) {
    const [user, interesting, applications] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { employabilityScore: true, cvScore: true },
      }),
      this.prisma.jobMatch.count({ where: { userId, globalScore: { gte: INTERESTING } } }),
      this.prisma.application.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { jobOffer: { select: { title: true, company: true, url: true } } },
      }),
    ]);

    const now = Date.now();
    const rows = applications.map((a) => {
      const needsFollowUp =
        a.status === 'submitted' &&
        !!a.submittedAt &&
        now - a.submittedAt.getTime() > WEEK_MS &&
        (!a.followedUpAt || now - a.followedUpAt.getTime() > WEEK_MS);
      return {
        id: a.id,
        title: a.jobOffer.title,
        company: a.jobOffer.company,
        url: a.jobOffer.url,
        status: a.status,
        matchScore: a.matchScore,
        submittedAt: a.submittedAt,
        interviewAt: (a as { interviewAt?: Date | null }).interviewAt ?? null,
        needsFollowUp,
      };
    });

    const funnel = {
      interesting,
      toApply: applications.filter((a) => a.status === 'pending_review' || a.status === 'approved').length,
      applied: applications.filter((a) => a.status === 'submitted').length,
      interview: applications.filter((a) => (a.status as string) === 'interview').length,
      offer: applications.filter((a) => (a.status as string) === 'offer').length,
      toFollowUp: rows.filter((r) => r.needsFollowUp).length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
    };

    return {
      employabilityScore: user.employabilityScore,
      cvScore: user.cvScore,
      funnel,
      applications: rows,
    };
  }
}
