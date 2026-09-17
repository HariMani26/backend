import 'reflect-metadata';
import { accountPreferencesSchema, changePasswordSchema, deleteAccountSchema, marriageReportSchema } from '@dto/account.dto';
import { authService } from './auth.service';
import { UserModel } from '@models/User.model';
import { accountService, defaultPreferences } from './account.service';

describe('Account settings and validation', () => {
  afterEach(() => jest.restoreAllMocks());

  it('defaults contact sharing to private', async () => {
    jest.spyOn(authService, 'getCurrentUser').mockResolvedValue(new UserModel({ mobile: '9000000001' }));
    expect(await accountService.preferences('user-id')).toEqual(defaultPreferences);
    expect(defaultPreferences.showContact).toBe(false);
  });

  it('cannot change account roles through settings', () => {
    expect(accountPreferencesSchema.safeParse({ ...defaultPreferences, role: 'admin' }).success).toBe(false);
  });

  it('requires strong changed passwords and exact deletion confirmation', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'short' }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ code: '123456', confirmation: 'yes' }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ code: '123456', confirmation: 'DELETE' }).success).toBe(true);
  });

  it('does not allow a member to publish their own marriage report', () => {
    expect(marriageReportSchema.safeParse({
      marriedThroughPlatform: true, marriageDate: '2025-01-01',
      consentForTestimonial: true, consentForPhotos: false, storyStatus: 'published',
    }).success).toBe(false);
  });

  it('requires explicit consent choices and a valid nonfuture marriage date', () => {
    expect(marriageReportSchema.safeParse({ marriedThroughPlatform: true, marriageDate: '2099-01-01' }).success).toBe(false);
  });
});