import mongoose from 'mongoose';

import { OtpModel } from '@models/Otp.model';
import { RefreshTokenModel } from '@models/RefreshToken.model';
import { UserModel } from '@models/User.model';
import { authService } from '@services/auth.service';
import { otpExpiryDate } from '@utils/otp';
import { hashSecret } from '@utils/password';

const TEST_DB_URI = 'mongodb://localhost:27017/weour_matrimony_test';
const TEST_MOBILE = '9000000001';

async function seedOtp(mobile: string, code: string): Promise<void> {
  await OtpModel.create({
    mobile,
    purpose: 'login',
    codeHash: await hashSecret(code),
    expiresAt: otpExpiryDate(),
    attempts: 0,
    maxAttempts: 5,
  });
}

describe('authService (integration against a real MongoDB)', () => {
  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await Promise.all([UserModel.deleteMany({}), OtpModel.deleteMany({}), RefreshTokenModel.deleteMany({})]);
  });

  it('creates a new user on first successful OTP verification', async () => {
    await seedOtp(TEST_MOBILE, '111111');

    const { user, tokens, isNewUser } = await authService.verifyOtpAndAuthenticate(TEST_MOBILE, '111111', {});

    expect(isNewUser).toBe(true);
    expect(user.mobile).toBe(TEST_MOBILE);
    expect(user.isPhoneVerified).toBe(true);
    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));
  });

  it('rejects an incorrect OTP and records the attempt', async () => {
    await seedOtp(TEST_MOBILE, '222222');

    await expect(authService.verifyOtpAndAuthenticate(TEST_MOBILE, '000000', {})).rejects.toThrow('Incorrect OTP');

    const otp = await OtpModel.findOne({ mobile: TEST_MOBILE });
    expect(otp?.attempts).toBe(1);
  });

  it('logs an existing user in on a later OTP verification instead of creating a duplicate', async () => {
    await seedOtp(TEST_MOBILE, '333333');
    const first = await authService.verifyOtpAndAuthenticate(TEST_MOBILE, '333333', {});

    await seedOtp(TEST_MOBILE, '444444');
    const second = await authService.verifyOtpAndAuthenticate(TEST_MOBILE, '444444', {});

    expect(second.isNewUser).toBe(false);
    expect(String(second.user._id)).toBe(String(first.user._id));
    await expect(UserModel.countDocuments({ mobile: TEST_MOBILE })).resolves.toBe(1);
  });

  it('rotates the refresh token and burns the whole family if a used token is replayed', async () => {
    await seedOtp(TEST_MOBILE, '555555');
    const { tokens } = await authService.verifyOtpAndAuthenticate(TEST_MOBILE, '555555', {});

    const rotatedOnce = await authService.refresh(tokens.refreshToken, {});
    expect(rotatedOnce.tokens.refreshToken).not.toBe(tokens.refreshToken);

    // Replaying the original (already-rotated-away) token must fail and burn the family...
    await expect(authService.refresh(tokens.refreshToken, {})).rejects.toThrow(/already been used or revoked/);

    // ...which kills the legitimately-rotated token too, since it shares the family.
    await expect(authService.refresh(rotatedOnce.tokens.refreshToken, {})).rejects.toThrow();
  });

  it('rejects admin login for a mobile-only (non-admin) account', async () => {
    await seedOtp(TEST_MOBILE, '666666');
    await authService.verifyOtpAndAuthenticate(TEST_MOBILE, '666666', {});

    await expect(authService.adminLogin('nobody@example.com', 'whatever-password', {})).rejects.toThrow(
      'Invalid email or password',
    );
  });
});
