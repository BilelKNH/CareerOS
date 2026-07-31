import { Application, ApplicationChannel } from '@prisma/client';
import {
  ApplicationChannelHandler,
  SubmitContext,
  SubmitResult,
} from '../application-channel.interface';

/**
 * Default channel: prepares a ready-to-send package but never submits on the
 * user's behalf. The user applies via the offer URL with the generated CV +
 * cover letter. Safe by construction (no ToS/CAPTCHA issues).
 */
export class ManualChannel implements ApplicationChannelHandler {
  readonly channel = ApplicationChannel.manual;
  readonly canAutoSubmit = false;

  async submit(_application: Application, ctx: SubmitContext): Promise<SubmitResult> {
    return {
      outcome: 'requires_manual',
      note: `Dossier prêt. Postule via ${ctx.offerUrl} avec le CV et la lettre générés.`,
    };
  }
}
