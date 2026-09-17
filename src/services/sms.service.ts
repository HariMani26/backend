import { logger } from "@/utils/logger";
import { SMS_PROVIDER_API_KEY, SMS_PROVIDER_SENDER_ID } from "@config";

import { ApiError } from "@utils/ApiError";
import { Container, Service } from "typedi";

/** MSG91 flow API — mirrors the mechanism the Figma-source ReminderService documents for SMS. */
async function sendViaMsg91(mobile: string, message: string): Promise<void> {
  const response = await fetch("https://api.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: SMS_PROVIDER_API_KEY as string,
    },
    body: JSON.stringify({
      sender: SMS_PROVIDER_SENDER_ID,
      route: "4",
      country: "91",
      sms: [{ message, to: [mobile] }],
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`MSG91 send failed (${response.status})`);
  }
}

@Service()
export class SmsService {
  public async sendOtp(mobile: string, message: string): Promise<void> {
    if (!SMS_PROVIDER_API_KEY) {
      if (process.env.NODE_ENV === "development" && process.env.SMS_MOCK_ENABLED === "true") {
        logger.warn(`[SMS mock mode] would send to ${mobile}: ${message}`);
        return;
      }
      throw ApiError.internal("SMS delivery is not configured");
    }

    try {
      await sendViaMsg91(mobile, message);
    } catch {
      logger.error("Failed to send OTP SMS");
      throw ApiError.internal("Failed to send OTP. Please try again.");
    }
  }
}

export const smsService = Container.get(SmsService);
