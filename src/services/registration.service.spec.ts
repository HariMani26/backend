import mongoose from 'mongoose';

import { PartnerPreferenceModel } from '@models/PartnerPreference.model';
import { ProfileModel } from '@models/Profile.model';
import { RegistrationDraftModel } from '@models/RegistrationDraft.model';
import { UserModel } from '@models/User.model';
import { registrationService } from '@services/registration.service';

const TEST_DB_URI = 'mongodb://localhost:27017/weour_matrimony_test';

const fullPayload = {
  name: 'Kavitha Raman',
  gender: 'female' as const,
  registrarName: 'Kavitha Raman',
  relationToProfile: 'self' as const,
  dob: new Date('1998-05-10'),
  heightCm: 162,
  maritalStatus: 'never-married' as const,
  state: 'Tamil Nadu',
  district: 'Madurai',
  education: 'B.E. Computer Science',
  occupation: 'Software Engineer',
  rasi: 'Mesham',
  star: 'Ashwini',
  kulam: 'dheppalu',
  partnerPreference: {
    ageMin: 27,
    ageMax: 34,
    preferredKulams: ['orsulu'],
    preferredDistricts: ['Chennai'],
    preferredEducation: [],
    preferredJobs: [],
  },
};

async function createTestUser(mobile: string) {
  return UserModel.create({ mobile, countryCode: '+91', isPhoneVerified: true });
}

describe('registrationService (integration against a real MongoDB)', () => {
  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      ProfileModel.deleteMany({}),
      PartnerPreferenceModel.deleteMany({}),
      RegistrationDraftModel.deleteMany({}),
    ]);
  });

  it('creates a Profile + PartnerPreference and assigns a WOM##### reference ID', async () => {
    const user = await createTestUser('9000000101');

    const profile = await registrationService.submitFull(String(user._id), fullPayload);

    expect(profile.referenceId).toMatch(/^WOM\d{5}$/);
    expect(profile.profileType).toBe('bride');
    expect(profile.registrationType).toBe('full');
    expect(profile.verificationStatus).toBe('unverified');

    const preference = await PartnerPreferenceModel.findOne({ userId: user._id });
    expect(preference?.ageMin).toBe(27);
    expect(preference?.preferredKulams).toEqual(['orsulu']);
  });

  it('rejects a second full registration for the same user', async () => {
    const user = await createTestUser('9000000102');
    await registrationService.submitFull(String(user._id), fullPayload);

    await expect(registrationService.submitFull(String(user._id), fullPayload)).rejects.toThrow(
      'A profile already exists for this account',
    );
  });

  it('assigns unique sequential reference IDs across registrations', async () => {
    const userA = await createTestUser('9000000103');
    const userB = await createTestUser('9000000104');

    const profileA = await registrationService.submitFull(String(userA._id), fullPayload);
    const profileB = await registrationService.submitFull(String(userB._id), { ...fullPayload, name: 'Different Name' });

    expect(profileA.referenceId).not.toBe(profileB.referenceId);
  });

  it('fills placeholder defaults for fields not collected during quick registration', async () => {
    const user = await createTestUser('9000000105');

    const profile = await registrationService.submitQuick(String(user._id), {
      name: 'Arun Kumar',
      gender: 'male',
      dob: new Date('1995-01-01'),
      district: 'Coimbatore',
      registrarName: 'Uncle Ravi',
      relationToProfile: 'relative',
    });

    expect(profile.registrationType).toBe('quick');
    expect(profile.profileType).toBe('groom');
    expect(profile.education).toBe('Not specified');
    expect(profile.kulam).toBe('other');
  });

  it('round-trips a wizard draft and clears it once the full registration is submitted', async () => {
    const user = await createTestUser('9000000106');

    expect(await registrationService.getDraft(String(user._id))).toEqual({});

    await registrationService.saveDraft(String(user._id), { name: 'Draft Name', district: 'Salem' });
    expect(await registrationService.getDraft(String(user._id))).toEqual({ name: 'Draft Name', district: 'Salem' });

    await registrationService.submitFull(String(user._id), fullPayload);
    expect(await registrationService.getDraft(String(user._id))).toEqual({});
  });
});
