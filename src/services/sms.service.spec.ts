import 'reflect-metadata';

jest.mock('@config', () => ({ SMS_PROVIDER_API_KEY: undefined, SMS_PROVIDER_SENDER_ID: undefined }));
jest.mock('@/utils/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

import { logger } from '@/utils/logger';
import { smsService } from './sms.service';

describe('SMS mock delivery policy', () => {
  const originalEnvironment = process.env.NODE_ENV;
  const originalMockFlag = process.env.SMS_MOCK_ENABLED;

  afterEach(() => {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
    if (originalMockFlag === undefined) delete process.env.SMS_MOCK_ENABLED;
    else process.env.SMS_MOCK_ENABLED = originalMockFlag;
    jest.clearAllMocks();
  });

  it.each(['production', 'test', 'staging'])('fails closed without provider credentials in %s', async (environment) => {
    process.env.NODE_ENV = environment;
    process.env.SMS_MOCK_ENABLED = 'true';
    await expect(smsService.sendOtp('9000000001', 'private-otp')).rejects.toThrow('SMS delivery is not configured');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('requires explicit opt-in even in development', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SMS_MOCK_ENABLED;
    await expect(smsService.sendOtp('9000000001', 'private-otp')).rejects.toThrow('SMS delivery is not configured');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('allows mock delivery only in explicitly enabled development', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SMS_MOCK_ENABLED = 'true';
    await expect(smsService.sendOtp('9000000001', 'dev-otp')).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});