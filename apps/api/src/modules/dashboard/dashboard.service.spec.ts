import { DashboardService } from './dashboard.service';
import { makePrisma } from '../../test-utils/prisma.mock';

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

describe('DashboardService (application tracker)', () => {
  it('builds the funnel and flags follow-ups', async () => {
    const prisma = makePrisma();
    prisma.user.findUniqueOrThrow.mockResolvedValue({ employabilityScore: 72, cvScore: 80 });
    prisma.jobMatch.count.mockResolvedValue(5);
    prisma.application.findMany.mockResolvedValue([
      { id: 'a1', status: 'submitted', submittedAt: daysAgo(10), followedUpAt: null, matchScore: 90, jobOffer: { title: 'X', company: 'Y', url: 'u' } },
      { id: 'a2', status: 'pending_review', submittedAt: null, followedUpAt: null, matchScore: 85, jobOffer: { title: 'Z', company: 'W', url: 'u2' } },
      { id: 'a3', status: 'rejected', submittedAt: daysAgo(2), followedUpAt: null, matchScore: 70, jobOffer: { title: 'R', company: 'C', url: 'u3' } },
    ]);

    const res = await new DashboardService(prisma).getOverview('u1');

    expect(res.funnel).toEqual({ interesting: 5, toApply: 1, applied: 1, interview: 0, offer: 0, toFollowUp: 1, rejected: 1 });
    expect(res.applications.find((a) => a.id === 'a1')?.needsFollowUp).toBe(true);
    expect(res.employabilityScore).toBe(72);
    expect(res.cvScore).toBe(80);
  });

  it('does not flag a recent submission for follow-up', async () => {
    const prisma = makePrisma();
    prisma.user.findUniqueOrThrow.mockResolvedValue({ employabilityScore: 50, cvScore: null });
    prisma.jobMatch.count.mockResolvedValue(0);
    prisma.application.findMany.mockResolvedValue([
      { id: 'a1', status: 'submitted', submittedAt: daysAgo(2), followedUpAt: null, matchScore: 90, jobOffer: { title: 'X', company: 'Y', url: 'u' } },
    ]);
    const res = await new DashboardService(prisma).getOverview('u1');
    expect(res.funnel.toFollowUp).toBe(0);
  });
});
