import 'reflect-metadata';

jest.mock('@config', () => ({
  OTP_BYPASS_ENABLED: 'true', OTP_BYPASS_NUMBER: '9999999999', OTP_BYPASS_CODE: '123456',
  OTP_BYPASS_NUMBERS: '9000000001, 9000000002,9000000003, ',
  OTP_MAX_ATTEMPTS: '5', OTP_RESEND_SECONDS: '30',
}));
jest.mock('@/utils/logger', () => ({ logger: { warn: jest.fn() } }));
jest.mock('@models/Otp.model', () => ({ OtpModel: {
  findOne: jest.fn(), create: jest.fn(), findByIdAndDelete: jest.fn(), findByIdAndUpdate: jest.fn(),
} }));
jest.mock('@services/sms.service', () => ({ smsService: { sendOtp: jest.fn() } }));
jest.mock('@utils/password', () => ({ hashSecret: jest.fn().mockResolvedValue('hash'), compareSecret: jest.fn() }));
jest.mock('@utils/otp', () => ({ generateOtpCode: jest.fn().mockReturnValue('654321'), otpExpiryDate: () => new Date() }));

import { OtpModel } from '@models/Otp.model';
import { smsService } from '@services/sms.service';
import { compareSecret, hashSecret } from '@utils/password';
import { otpService } from './otp.service';

describe('OTP development bypass and delivery failure', () => {
  const originalEnvironment = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    (hashSecret as jest.Mock).mockReset().mockResolvedValue('hash');
    (compareSecret as jest.Mock).mockReset();
    (OtpModel.findOne as jest.Mock).mockReturnValue({ sort: jest.fn().mockResolvedValue(null) });
    (OtpModel.create as jest.Mock).mockResolvedValue({ _id: 'new-otp-id' });
    (smsService.sendOtp as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
  });

  it.each(['9000000001', '9000000002', '9000000003', '9999999999'])('uses a generated OTP and real delivery in production for %s even if bypass is enabled', async (mobile) => {
    process.env.NODE_ENV = 'production';
    await otpService.sendOtp(mobile, 'login');
    expect(hashSecret).toHaveBeenCalledWith('654321');
    expect(smsService.sendOtp).toHaveBeenCalledTimes(1);
  });

  it.each(['9000000001', '9000000002', '9000000003', '9999999999'])('allows configured bypass number %s in development', async (mobile) => {
    process.env.NODE_ENV = 'development';
    await otpService.sendOtp(mobile, 'login');
    expect(hashSecret).toHaveBeenCalledWith('123456');
    expect(smsService.sendOtp).not.toHaveBeenCalled();
  });

  it.each(['9000000004', '900000000', ''])('does not bypass delivery for unlisted development number %s', async (mobile) => {
    process.env.NODE_ENV = 'development';
    await otpService.sendOtp(mobile, 'login');
    expect(hashSecret).toHaveBeenCalledWith('654321');
    expect(smsService.sendOtp).toHaveBeenCalledTimes(1);
  });

  it.each(['9000000001', '9000000002', '9000000003'])('requests and verifies the fixed OTP for %s with real hashing', async (mobile) => {
    process.env.NODE_ENV = 'development';
    const passwordUtils = jest.requireActual<typeof import('@utils/password')>('@utils/password');
    (hashSecret as jest.Mock).mockImplementation(passwordUtils.hashSecret);
    (compareSecret as jest.Mock).mockImplementation(passwordUtils.compareSecret);

    await otpService.sendOtp(mobile, 'login');
    const document = (OtpModel.create as jest.Mock).mock.calls[0][0];
    expect(document.codeHash).not.toBe('123456');
    (OtpModel.findOne as jest.Mock).mockReturnValue({ sort: jest.fn().mockResolvedValue({
      ...document, _id: 'new-otp-id', attempts: 0,
    }) });

    await expect(otpService.verifyOtp(mobile, 'login', '000000')).rejects.toThrow('Incorrect OTP');
    expect(OtpModel.findByIdAndUpdate).toHaveBeenCalledWith('new-otp-id', { $inc: { attempts: 1 } });
    await expect(otpService.verifyOtp(mobile, 'login', '123456')).resolves.toBeUndefined();
    expect(OtpModel.findByIdAndUpdate).toHaveBeenLastCalledWith('new-otp-id', {
      $set: { consumedAt: expect.any(Date) },
    });
    expect(smsService.sendOtp).not.toHaveBeenCalled();
  });

  it('removes only the newly created OTP when delivery fails', async () => {
    process.env.NODE_ENV = 'production';
    (smsService.sendOtp as jest.Mock).mockRejectedValue(new Error('delivery failed'));
    await expect(otpService.sendOtp('9000000001', 'login')).rejects.toThrow('delivery failed');
    expect(OtpModel.findByIdAndDelete).toHaveBeenCalledWith('new-otp-id');
  });
});