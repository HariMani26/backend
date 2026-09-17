import { logger } from "@/utils/logger";
import { REMINDER_FROM_EMAIL, RESEND_API_KEY } from "@config";
import { Container, Service } from "typedi";

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Resend-backed transactional email — mirrors the mechanism the Figma-source ReminderService documents for email. */
@Service()
export class MailService {
  public async send(input: SendMailInput): Promise<void> {
    if (!RESEND_API_KEY) {
      logger.warn(
        `[Mail mock mode] would send "${input.subject}" to ${input.to}`,
      );
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: REMINDER_FROM_EMAIL,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error(`Resend send failed (${response.status}): ${body}`);
      throw new Error("Failed to send email");
    }
  }
}

export const mailService = Container.get(MailService);
