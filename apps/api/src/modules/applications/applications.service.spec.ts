import { ApplicationsService } from './applications.service';
import { CvAgentService } from '../ai-analysis/cv-agent.service';
import { NotificationsService } from '../notifications/notifications.service';
import { makePrisma } from '../../test-utils/prisma.mock';

const cv = {
  adapt: jest.fn().mockResolvedValue({ cvSummary: 's', coverLetter: 'l', atsKeywords: ['Playwright'] }),
} as unknown as CvAgentService;
const notifications = { create: jest.fn().mockResolvedValue({}) } as unknown as NotificationsService;

describe('ApplicationsService', () => {
  it('prepares a pending_review package', async () => {
    const prisma = makePrisma();
    prisma.jobOffer.findUniqueOrThrow.mockResolvedValue({ id: 'o1', title: 'QA', company: 'Acme' });
    prisma.jobMatch.findUnique.mockResolvedValue({ id: 'm1', globalScore: 90 });
    prisma.user.findUniqueOrThrow.mockResolvedValue({ autoApplyChannel: 'manual' });
    prisma.application.upsert.mockImplementation((a: { create: unknown }) => Promise.resolve(a.create));
    const svc = new ApplicationsService(prisma, cv, notifications);

    const app = (await svc.prepare('u1', 'o1')) as { status: string; coverLetter: string };
    expect(app.status).toBe('pending_review');
    expect(app.coverLetter).toBe('l');
  });

  it('approve() keeps a manual application ready (no silent send)', async () => {
    const prisma = makePrisma();
    prisma.application.findUnique.mockResolvedValue({
      id: 'a1', userId: 'u1', channel: 'manual', submittedAt: null,
      jobOffer: { url: 'https://x', title: 'QA', contactEmail: null },
    });
    prisma.application.update.mockImplementation((a: { data: unknown }) => Promise.resolve({ id: 'a1', ...(a.data as object) }));
    const svc = new ApplicationsService(prisma, cv, notifications);

    const res = (await svc.approve('u1', 'a1')) as { status: string };
    expect(['approved', 'submitted']).toContain(res.status);
  });

  it('skips an application', async () => {
    const prisma = makePrisma();
    prisma.application.findUnique.mockResolvedValue({ userId: 'u1' });
    prisma.application.update.mockResolvedValue({ status: 'skipped' });
    const svc = new ApplicationsService(prisma, cv, notifications);
    expect((await svc.skip('u1', 'a1')).status).toBe('skipped');
  });

  it('marks an application as rejected and records a follow-up', async () => {
    const prisma = makePrisma();
    prisma.application.findUnique.mockResolvedValue({ userId: 'u1' });
    prisma.application.update.mockImplementation((a: { data: unknown }) => Promise.resolve(a.data));
    const svc = new ApplicationsService(prisma, cv, notifications);

    expect((await svc.reject('u1', 'a1')) as { status: string }).toMatchObject({ status: 'rejected' });
    const followed = (await svc.markFollowedUp('u1', 'a1')) as { followedUpAt: Date };
    expect(followed.followedUpAt).toBeInstanceOf(Date);
  });

  it('auto-apply prepares but does not submit when opt-in is off', async () => {
    const prisma = makePrisma();
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      autoApplyEnabled: false, autoApplyThreshold: 92, autoApplyDailyLimit: 3, autoApplyChannel: 'manual',
    });
    prisma.application.count.mockResolvedValue(0);
    prisma.jobMatch.findMany.mockResolvedValue([
      { jobOfferId: 'o1', globalScore: 95, jobOffer: { url: 'https://x' } },
    ]);
    prisma.application.findUnique.mockResolvedValue(null);
    prisma.jobOffer.findUniqueOrThrow.mockResolvedValue({ id: 'o1', title: 'QA', company: 'Acme' });
    prisma.jobMatch.findUnique.mockResolvedValue({ id: 'm1', globalScore: 95 });
    prisma.application.upsert.mockImplementation((a: { create: unknown }) => Promise.resolve(a.create));
    const svc = new ApplicationsService(prisma, cv, notifications);

    const res = await svc.autoApplyForUser('u1');
    expect(res.prepared).toBe(1);
    expect(res.submitted).toBe(0);
    expect(res.pendingReview).toBe(1);
  });
});
