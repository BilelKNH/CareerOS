import { Application, ApplicationChannel as Channel } from '@prisma/client';

export interface SubmitContext {
  offerUrl: string;
  offerTitle: string;
  contactEmail?: string | null;
}

export type SubmitResult =
  | { outcome: 'submitted'; note?: string }
  | { outcome: 'requires_manual'; note: string }
  | { outcome: 'failed'; note: string };

/**
 * A channel through which an application can be sent. Kept behind an interface
 * so responsible channels (email with a real contact, manual export) can be
 * added without ever hard-coding a bot that violates a site's Terms of Service.
 */
export interface ApplicationChannelHandler {
  readonly channel: Channel;
  /** Whether this channel is allowed to submit without a human click. */
  readonly canAutoSubmit: boolean;
  submit(application: Application, ctx: SubmitContext): Promise<SubmitResult>;
}
