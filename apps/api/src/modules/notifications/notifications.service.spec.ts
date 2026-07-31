import { NotificationsService } from './notifications.service';
import { makePrisma } from '../../test-utils/prisma.mock';

describe('NotificationsService', () => {
  it('marks all unread as read and reports the count', async () => {
    const prisma = makePrisma();
    prisma.notification.updateMany.mockResolvedValue({ count: 3 });
    const svc = new NotificationsService(prisma);

    const res = await svc.markAllRead('u1');

    expect(res).toEqual({ read: true, updated: 3 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', read: false },
      data: { read: true },
    });
  });

  it('creates one high-match notification per new match', async () => {
    const prisma = makePrisma();
    prisma.jobMatch.findMany.mockResolvedValue([
      { id: 'm1', globalScore: 95, jobOfferId: 'o1', interviewProbability: 'elevee', jobOffer: { title: 'QA', company: 'Acme' } },
    ]);
    prisma.notification.findFirst.mockResolvedValue(null); // not already notified
    prisma.notification.create.mockResolvedValue({ id: 'n1' });
    const svc = new NotificationsService(prisma);

    const created = await svc.notifyHighMatches('u1');

    expect(created).toHaveLength(1);
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it('skips matches that were already notified (idempotent)', async () => {
    const prisma = makePrisma();
    prisma.jobMatch.findMany.mockResolvedValue([
      { id: 'm1', globalScore: 92, jobOfferId: 'o1', interviewProbability: 'elevee', jobOffer: { title: 'QA', company: 'Acme' } },
    ]);
    prisma.notification.findFirst.mockResolvedValue({ id: 'existing' });
    const svc = new NotificationsService(prisma);

    const created = await svc.notifyHighMatches('u1');

    expect(created).toHaveLength(0);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});
