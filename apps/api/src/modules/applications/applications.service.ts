import { Injectable, Logger } from '@nestjs/common';
import {
  Application,
  ApplicationChannel,
  ApplicationStatus,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CvAgentService } from '../ai-analysis/cv-agent.service';
import { NotificationsService } from '../notifications/notifications.service';
import { assertOwnership } from '../../common/utils/ownership';
import { ApplicationChannelHandler, SubmitContext } from './application-channel.interface';
import { ManualChannel } from './channels/manual.channel';
import { EmailChannel } from './channels/email.channel';

export interface AutoApplyResult {
  prepared: number;
  submitted: number;
  pendingReview: number;
  skippedByLimit: number;
}

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);
  private readonly channels: Record<ApplicationChannel, ApplicationChannelHandler> = {
    manual: new ManualChannel(),
    email: new EmailChannel(),
    external_url: new ManualChannel(), // recording the URL; submission stays manual
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly cv: CvAgentService,
    private readonly notifications: NotificationsService,
  ) {}

  list(userId: string) {
    return this.prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { jobOffer: { select: { title: true, company: true, url: true } } },
    });
  }

  async get(userId: string, id: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { jobOffer: true },
    });
    assertOwnership(app, userId, 'Application');
    return app;
  }

  /**
   * Build a ready-to-send application package (tailored CV + cover letter).
   * Never submits — status lands in pending_review for the user to approve.
   */
  async prepare(userId: string, offerId: string): Promise<Application> {
    const [offer, match, user] = await Promise.all([
      this.prisma.jobOffer.findUniqueOrThrow({ where: { id: offerId } }),
      this.prisma.jobMatch.findUnique({ where: { userId_jobOfferId: { userId, jobOfferId: offerId } } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { autoApplyChannel: true } }),
    ]);

    const cv = await this.cv.adapt(userId, offerId);

    const application = await this.prisma.application.upsert({
      where: { userId_jobOfferId: { userId, jobOfferId: offerId } },
      create: {
        userId,
        jobOfferId: offerId,
        jobMatchId: match?.id,
        status: ApplicationStatus.pending_review,
        channel: user.autoApplyChannel,
        matchScore: match?.globalScore,
        cvSummary: cv.cvSummary,
        coverLetter: cv.coverLetter,
        atsKeywords: cv.atsKeywords,
      },
      update: {
        cvSummary: cv.cvSummary,
        coverLetter: cv.coverLetter,
        atsKeywords: cv.atsKeywords,
        matchScore: match?.globalScore,
      },
    });

    await this.notifications.create(
      userId,
      NotificationType.application_ready,
      `Candidature prête — ${offer.title}`,
      `${offer.company ?? ''} · matching ${match?.globalScore ?? '—'}% · à relire et valider`,
      { applicationId: application.id, offerId },
    );

    return application;
  }

  /** User approves a prepared application → attempt to submit via its channel. */
  async approve(userId: string, id: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { jobOffer: true },
    });
    assertOwnership(app, userId, 'Application');
    await this.prisma.application.update({
      where: { id },
      data: { status: ApplicationStatus.approved, reviewedAt: new Date() },
    });
    return this.submit(app!.userId, app!);
  }

  async skip(userId: string, id: string) {
    assertOwnership(await this.prisma.application.findUnique({ where: { id } }), userId, 'Application');
    return this.prisma.application.update({
      where: { id },
      data: { status: ApplicationStatus.skipped },
    });
  }

  /** Mark an application as rejected (refus). */
  async reject(userId: string, id: string) {
    assertOwnership(await this.prisma.application.findUnique({ where: { id } }), userId, 'Application');
    return this.prisma.application.update({
      where: { id },
      data: { status: ApplicationStatus.rejected },
    });
  }

  /** Record that the user followed up (relance) — resets the follow-up timer. */
  async markFollowedUp(userId: string, id: string) {
    assertOwnership(await this.prisma.application.findUnique({ where: { id } }), userId, 'Application');
    return this.prisma.application.update({
      where: { id },
      data: { followedUpAt: new Date() },
    });
  }

  /** Submit through the configured channel and record the outcome. */
  private async submit(
    userId: string,
    app: Application & { jobOffer: { url: string; title: string; contactEmail: string | null } },
  ) {
    const handler = this.channels[app.channel];
    const ctx: SubmitContext = {
      offerUrl: app.jobOffer.url,
      offerTitle: app.jobOffer.title,
      contactEmail: app.jobOffer.contactEmail,
    };
    const result = await handler.submit(app, ctx);

    const status =
      result.outcome === 'submitted'
        ? ApplicationStatus.submitted
        : result.outcome === 'failed'
          ? ApplicationStatus.failed
          : ApplicationStatus.approved; // requires_manual → stays approved (ready to send)

    const updated = await this.prisma.application.update({
      where: { id: app.id },
      data: {
        status,
        notes: result.note,
        submittedAt: result.outcome === 'submitted' ? new Date() : app.submittedAt,
      },
    });

    if (result.outcome === 'submitted') {
      await this.notifications.create(
        userId,
        NotificationType.application_submitted,
        'Candidature envoyée',
        result.note,
        { applicationId: app.id },
      );
    }
    return updated;
  }

  /**
   * Autonomous entry point (called by the Career Agent). Prepares packages for
   * the best matches. Auto-submits ONLY if the user opted in, the channel allows
   * it, the score clears the threshold, and the daily limit isn't exhausted.
   */
  async autoApplyForUser(userId: string): Promise<AutoApplyResult> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        autoApplyEnabled: true,
        autoApplyThreshold: true,
        autoApplyDailyLimit: true,
        autoApplyChannel: true,
      },
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const submittedToday = await this.prisma.application.count({
      where: { userId, submittedAt: { gte: startOfDay } },
    });
    let budget = Math.max(0, user.autoApplyDailyLimit - submittedToday);

    const candidates = await this.prisma.jobMatch.findMany({
      where: { userId, globalScore: { gte: user.autoApplyThreshold } },
      orderBy: { globalScore: 'desc' },
      include: { jobOffer: true },
    });

    const handler = this.channels[user.autoApplyChannel];
    const result: AutoApplyResult = { prepared: 0, submitted: 0, pendingReview: 0, skippedByLimit: 0 };

    for (const match of candidates) {
      const existing = await this.prisma.application.findUnique({
        where: { userId_jobOfferId: { userId, jobOfferId: match.jobOfferId } },
      });
      // Skip anything already handled (prepared, submitted, skipped…).
      if (existing && existing.status !== ApplicationStatus.draft) continue;

      const app = await this.prepare(userId, match.jobOfferId);
      result.prepared += 1;

      if (user.autoApplyEnabled && handler.canAutoSubmit) {
        if (budget <= 0) {
          result.skippedByLimit += 1;
          continue;
        }
        const submitted = await this.submit(userId, {
          ...app,
          jobOffer: {
            url: match.jobOffer.url,
            title: match.jobOffer.title,
            contactEmail: match.jobOffer.contactEmail,
          },
        });
        if (submitted.status === ApplicationStatus.submitted) {
          result.submitted += 1;
          budget -= 1;
        } else {
          result.pendingReview += 1;
        }
      } else {
        result.pendingReview += 1;
      }
    }

    this.logger.log(
      `Auto-apply ${userId}: prepared ${result.prepared}, submitted ${result.submitted}, pending ${result.pendingReview}.`,
    );
    return result;
  }
}
