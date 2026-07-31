import { Injectable } from '@nestjs/common';
import { Notification, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// A "fort match" is 80%+ (same rule as the Offres page colour code).
const HIGH_MATCH_THRESHOLD = 80;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
    return { read: true };
  }

  async markAllRead(userId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { read: true, updated: count };
  }

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body?: string,
    data?: Prisma.InputJsonValue,
  ) {
    return this.prisma.notification.create({ data: { userId, type, title, body, data } });
  }

  /**
   * Emit a high_match notification for each match above the threshold that
   * doesn't already have one (idempotent via the jobMatchId stored in data).
   */
  async notifyHighMatches(userId: string) {
    const matches = await this.prisma.jobMatch.findMany({
      where: { userId, globalScore: { gte: HIGH_MATCH_THRESHOLD } },
      include: { jobOffer: { select: { title: true, company: true } } },
    });

    const created: Notification[] = [];
    for (const m of matches) {
      const already = await this.prisma.notification.findFirst({
        where: { userId, type: NotificationType.high_match, data: { path: ['jobMatchId'], equals: m.id } },
      });
      if (already) continue;
      created.push(
        await this.create(
          userId,
          NotificationType.high_match,
          `Matching ${m.globalScore}% — ${m.jobOffer.title}`,
          `${m.jobOffer.company ?? 'Entreprise'} · probabilité d'entretien ${m.interviewProbability}`,
          { jobMatchId: m.id, jobOfferId: m.jobOfferId, score: m.globalScore },
        ),
      );
    }
    return created;
  }
}
