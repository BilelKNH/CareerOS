import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JobSearchService {
  constructor(private readonly prisma: PrismaService) {}

  listOffers(userId: string, source?: string, take = 100) {
    return this.prisma.jobOffer.findMany({
      where: source ? { source: source as never } : undefined,
      orderBy: { scrapedAt: 'desc' },
      take,
      include: {
        matches: { where: { userId }, select: { globalScore: true, interviewProbability: true } },
        applications: { where: { userId }, select: { id: true, status: true } },
      },
    });
  }

  async getOffer(userId: string, offerId: string) {
    const offer = await this.prisma.jobOffer.findUnique({
      where: { id: offerId },
      include: { matches: { where: { userId } } },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    return { ...offer, match: offer.matches[0] ?? null };
  }

  listMatches(userId: string, take = 100) {
    return this.prisma.jobMatch.findMany({
      where: { userId },
      orderBy: { globalScore: 'desc' },
      take,
      include: {
        jobOffer: {
          select: { id: true, title: true, company: true, location: true, url: true, source: true },
        },
      },
    });
  }
}
