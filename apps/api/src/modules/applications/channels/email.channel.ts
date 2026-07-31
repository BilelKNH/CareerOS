import { Logger } from '@nestjs/common';
import { Application, ApplicationChannel } from '@prisma/client';
import {
  ApplicationChannelHandler,
  SubmitContext,
  SubmitResult,
} from '../application-channel.interface';

/**
 * Email channel: can auto-submit ONLY when a real contact email is known for
 * the offer. Wiring a live SMTP/provider is left as an integration point — the
 * handler fails safe (requires_manual) when nothing is configured, so the agent
 * never silently "sends" into the void.
 */
export class EmailChannel implements ApplicationChannelHandler {
  readonly channel = ApplicationChannel.email;
  readonly canAutoSubmit = true;
  private readonly logger = new Logger(EmailChannel.name);

  async submit(application: Application, ctx: SubmitContext): Promise<SubmitResult> {
    if (!ctx.contactEmail) {
      return {
        outcome: 'requires_manual',
        note: 'Aucune adresse de contact sur l’offre — envoi par email impossible, à faire manuellement.',
      };
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      return {
        outcome: 'failed',
        note: 'Canal email non configuré (RESEND_API_KEY / EMAIL_FROM manquant).',
      };
    }

    const subject = `Candidature — ${ctx.offerTitle}`;
    const text = [
      application.coverLetter ?? '',
      '',
      '— Profil —',
      application.cvSummary ?? '',
      application.atsKeywords.length ? `Compétences clés : ${application.atsKeywords.join(', ')}` : '',
      '',
      `Réf. offre : ${ctx.offerUrl}`,
    ].join('\n');

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: ctx.contactEmail, subject, text }),
      });
      if (!res.ok) {
        return { outcome: 'failed', note: `Échec envoi email (${res.status}).` };
      }
      this.logger.log(`Application ${application.id} emailed to ${ctx.contactEmail}.`);
      return { outcome: 'submitted', note: `Candidature envoyée à ${ctx.contactEmail}.` };
    } catch (err) {
      return { outcome: 'failed', note: `Erreur envoi email : ${(err as Error).message}` };
    }
  }
}
