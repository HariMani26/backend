import { env } from '@config/env';
import { logger } from '@config/logger';
import { ApiError } from '@utils/ApiError';

/** MSG91 flow API — mirrors the mechanism the Figma-source ReminderService documents for SMS. */
async function sendViaMsg91(mobile: string, message: string): Promise<void> {
  const response = await fetch('https://api.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: env.SMS_PROVIDER_API_KEY },
    body: JSON.stringify({
      sender: env.SMS_PROVIDER_SENDER_ID,
      route: '4',
      country: '91',
      sms: [{ message, to: [mobile] }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`MSG91 send failed (${response.status}): ${body}`);
  }
}

export const smsService = {
  async sendOtp(mobile: string, message: string): Promise<void> {
    if (!env.SMS_PROVIDER_API_KEY) {
      // Mock mode — no SMS_PROVIDER_API_KEY configured. Log instead of sending, so local/dev works out of the box.
      logger.warn(`[SMS mock mode] would send to ${mobile}: ${message}`);
      return;
    }

    try {
      await sendViaMsg91(mobile, message);
    } catch (error) {
      logger.error('Failed to send OTP SMS', error);
      throw ApiError.internal('Failed to send OTP. Please try again.');
    }
  },
};
