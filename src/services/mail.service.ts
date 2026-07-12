import { env } from '@config/env';
import { logger } from '@config/logger';

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Resend-backed transactional email — mirrors the mechanism the Figma-source ReminderService documents for email. */
export const mailService = {
  async send(input: SendMailInput): Promise<void> {
    if (!env.RESEND_API_KEY) {
      logger.warn(`[Mail mock mode] would send "${input.subject}" to ${input.to}`);
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: env.REMINDER_FROM_EMAIL,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error(`Resend send failed (${response.status}): ${body}`);
      throw new Error('Failed to send email');
    }
  },
};
