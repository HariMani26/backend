import request from 'supertest';
import { createApp } from '../app';
import { ProfileModel } from '@models/Profile.model';
import { UserModel } from '@models/User.model';
import { adminCreateMemberSchema, adminListSchema, adminProfileUpdateSchema, moderationSchema } from '@dto/admin.dto';
import { tokenService } from './token.service';
import { adminService, assertStoryPublishable, moderateProfile } from './admin.service';

describe('Admin moderation', () => {
  afterEach(() => jest.restoreAllMocks());

  it('validates list filters and restricts sortable fields', () => {
    expect(adminListSchema.parse({ gender: 'female', registrationType: 'full', ageMin: '25', ageMax: '35', sortBy: 'name', sortDirection: 'asc' })).toMatchObject({ ageMin: 25, ageMax: 35, page: 1 });
    for (const query of [{ ageMin: 40, ageMax: 20 }, { ageMin: 17 }, { sortBy: '$where' }, { gender: 'invalid' }, { marriage: 'invalid' }]) {
      expect(adminListSchema.safeParse(query).success).toBe(false);
    }
  });

  it('filters and sorts before pagination and returns contact and district data', async () => {
    const profiles = { sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    const find = jest.spyOn(ProfileModel, 'find').mockReturnValue(profiles as any);
    jest.spyOn(ProfileModel, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(ProfileModel, 'distinct').mockResolvedValue(['Salem', 'Chennai']);
    jest.spyOn(UserModel, 'find').mockReturnValue({ select: jest.fn().mockResolvedValue([]) } as any);
    const result = await adminService.users(adminListSchema.parse({ gender: 'female', district: 'Chennai', registrationType: 'full', ageMin: 25, ageMax: 35, search: '9000', sortBy: 'name', sortDirection: 'asc', page: 2 }));
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ gender: 'female', district: 'Chennai', registrationType: 'full', dob: { $lte: expect.any(Date), $gt: expect.any(Date) }, $or: expect.any(Array) }));
    expect(profiles.sort).toHaveBeenCalledWith({ name: 1, _id: 1 });
    expect(profiles.skip).toHaveBeenCalledWith(25);
    expect(result.districts).toEqual(['Chennai', 'Salem']);
  });

  it.each(['unverified', 'verified', 'rejected', 'refunded'] as const)('restores %s after suspension', (status) => {
    const profile = new ProfileModel({ verificationStatus: status });
    moderateProfile(profile, 'suspend');
    expect(profile.verificationStatus).toBe('suspended');
    moderateProfile(profile, 'unsuspend');
    expect(profile.verificationStatus).toBe(status);
    expect(profile.previousVerificationStatus).toBeUndefined();
  });

  it('does not approve suspended or refunded profiles', () => {
    for (const status of ['suspended', 'refunded']) {
      expect(() => moderateProfile(new ProfileModel({ verificationStatus: status }), 'approve')).toThrow();
    }
  });

  it('cannot inject ownership, access or publication through profile edits', () => {
    for (const field of ['userId', 'accessTill', 'verificationStatus', 'successStory', 'marriageStatus', 'isDeleted']) {
      expect(adminProfileUpdateSchema.safeParse({ [field]: 'injected' }).success).toBe(false);
    }
    expect(moderationSchema.safeParse({ action: 'approve', reason: '' }).success).toBe(false);
  });

  it('does not turn approval into paid membership', () => {
    const profile = new ProfileModel({ verificationStatus: 'unverified' });
    moderateProfile(profile, 'approve');
    expect(profile.verificationStatus).toBe('verified');
    expect(profile.accessTill).toBeUndefined();
  });

  it.each(['unverified', 'verified', 'rejected'] as const)('reviews %s without changing existing access expiry', (status) => {
    const accessTill = new Date('2020-01-01');
    const profile = new ProfileModel({ verificationStatus: status, accessTill });
    moderateProfile(profile, 'approve');
    expect(profile.verificationStatus).toBe('verified');
    expect(profile.accessTill).toEqual(accessTill);
    moderateProfile(profile, 'reject');
    expect(profile.verificationStatus).toBe('rejected');
    expect(profile.accessTill).toEqual(accessTill);
  });

  it('rejects invalid suspension transitions', () => {
    expect(() => moderateProfile(new ProfileModel({ verificationStatus: 'suspended' }), 'suspend')).toThrow('already suspended');
    expect(() => moderateProfile(new ProfileModel({ verificationStatus: 'verified' }), 'unsuspend')).toThrow('not suspended');
    const profile = new ProfileModel({ verificationStatus: 'suspended' });
    moderateProfile(profile, 'unsuspend');
    expect(profile.verificationStatus).toBe('unverified');
  });

  it.each(['suspended', 'refunded'] as const)('cannot reject %s before resolving its state', (status) => {
    expect(() => moderateProfile(new ProfileModel({ verificationStatus: status }), 'reject')).toThrow();
  });

  it.each(['', '  ', 'ab', 'a'.repeat(1001)])('rejects invalid moderation reason length %s', (reason) => {
    expect(moderationSchema.safeParse({ action: 'approve', reason }).success).toBe(false);
  });

  it('soft deletes without granting verification or access', () => {
    const profile = new ProfileModel({ verificationStatus: 'unverified' });
    moderateProfile(profile, 'delete');
    expect(profile.isDeleted).toBe(true);
    expect(profile.deletedAt).toBeInstanceOf(Date);
    expect(profile.verificationStatus).toBe('unverified');
    expect(profile.accessTill).toBeUndefined();
  });

  it('requires explicit consent and both language versions for publication', () => {
    const profile = new ProfileModel({ marriageStatus: { isMarried: true, consentForTestimonial: false } });
    expect(() => assertStoryPublishable(profile)).toThrow('consent');
    profile.marriageStatus.consentForTestimonial = true;
    expect(() => assertStoryPublishable(profile)).toThrow('both language');
    profile.successStory = { title: 'Title', titleTa: 'Title', summary: 'Summary', summaryTa: 'Summary', fullStory: 'Story', fullStoryTa: 'Story', photoIds: [], coverPhotoIndex: 0, viewCount: 0, showNames: false, showLocation: false, featured: false };
    expect(() => assertStoryPublishable(profile)).not.toThrow();
    profile.successStory.videoUrl = 'https://youtu.be/example';
    expect(() => assertStoryPublishable(profile)).toThrow('Photo consent');
  });

  it('does not allow ordinary admins to manage roles', async () => {
    const admin = new UserModel({ mobile: '9000000001', role: 'admin', isActive: true });
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(admin);
    const token = tokenService.signAccessTokenFor(String(admin._id), admin.role);
    const response = await request(createApp()).get('/api/admin/administrators').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  it('rejects a stale admin token when the database role is now user', async () => {
    const member = new UserModel({ mobile: '9000000001', role: 'user', isActive: true });
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(member);
    const dashboard = jest.spyOn(adminService, 'dashboard');
    const token = tokenService.signAccessTokenFor(String(member._id), 'admin' as typeof member.role);
    const response = await request(createApp()).get('/api/admin/dashboard').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
    expect(dashboard).not.toHaveBeenCalled();
  });

  it.each(['/dashboard', '/users', '/payments', '/settings'])('protects admin %s from guests', async (path) => {
    expect((await request(createApp()).get(`/api/admin${path}`)).status).toBe(401);
  });
});

describe('Admin manual member validation', () => {
  afterEach(() => jest.restoreAllMocks());
  const payload = {
    mobile: '9000090001', consentConfirmed: true, reason: 'Member requested registration',
    profile: { name: 'Manual Member', gender: 'female', dob: '1995-01-01', district: 'Chennai', registrarName: 'Member Parent', relationToProfile: 'mother' },
  };

  it('accepts a valid adult quick registration', () => {
    expect(adminCreateMemberSchema.safeParse(payload).success).toBe(true);
  });

  it.each(['role', 'isPhoneVerified', 'accessTill', 'userId'])('rejects injected account field %s', (field) => {
    expect(adminCreateMemberSchema.safeParse({ ...payload, [field]: 'injected' }).success).toBe(false);
  });

  it.each(['verificationStatus', 'accessTill', 'userId', 'successStory'])('rejects injected profile field %s', (field) => {
    expect(adminCreateMemberSchema.safeParse({ ...payload, profile: { ...payload.profile, [field]: 'injected' } }).success).toBe(false);
  });

  it.each(['not-a-date', '', null, true, 0, '1995-02-31', '2099-01-01', new Date().toISOString()])('rejects invalid or underage DOB %s', (dob) => {
    expect(adminCreateMemberSchema.safeParse({ ...payload, profile: { ...payload.profile, dob } }).success).toBe(false);
  });

  it.each(['', '123', 'abcdefghij', '+919000090001'])('rejects invalid mobile %s', (mobile) => {
    expect(adminCreateMemberSchema.safeParse({ ...payload, mobile }).success).toBe(false);
  });

  it('accepts the eighteenth birthday but rejects the day before it', () => {
    const birthday = new Date();
    birthday.setUTCFullYear(birthday.getUTCFullYear() - 18);
    birthday.setUTCHours(0, 0, 0, 0);
    expect(adminCreateMemberSchema.safeParse({ ...payload, profile: { ...payload.profile, dob: birthday.toISOString().slice(0, 10) } }).success).toBe(true);
    birthday.setUTCDate(birthday.getUTCDate() + 1);
    expect(adminCreateMemberSchema.safeParse({ ...payload, profile: { ...payload.profile, dob: birthday.toISOString().slice(0, 10) } }).success).toBe(false);
  });

  it('requires consent and a meaningful reason', () => {
    expect(adminCreateMemberSchema.safeParse({ ...payload, consentConfirmed: false }).success).toBe(false);
    expect(adminCreateMemberSchema.safeParse({ ...payload, reason: '   ' }).success).toBe(false);
  });

  it('protects creation from guests and members', async () => {
    expect((await request(createApp()).post('/api/admin/users').send(payload)).status).toBe(401);
    const member = new UserModel({ mobile: '9000000002', role: 'user', isActive: true });
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(member);
    const create = jest.spyOn(adminService, 'createMember');
    const token = tokenService.signAccessTokenFor(String(member._id), member.role);
    expect((await request(createApp()).post('/api/admin/users').set('Authorization', `Bearer ${token}`).send(payload)).status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it('validates before invoking creation and returns the created profile', async () => {
    const admin = new UserModel({ mobile: '9000000001', role: 'admin', isActive: true });
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(admin);
    const create = jest.spyOn(adminService, 'createMember').mockResolvedValue({ id: 'created' } as any);
    const token = tokenService.signAccessTokenFor(String(admin._id), admin.role);
    const invalid = await request(createApp()).post('/api/admin/users').set('Authorization', `Bearer ${token}`).send({ ...payload, consentConfirmed: false });
    expect(invalid.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
    const response = await request(createApp()).post('/api/admin/users').set('Authorization', `Bearer ${token}`).send(payload);
    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe('created');
    expect(create).toHaveBeenCalledWith(String(admin._id), expect.objectContaining({ profile: expect.objectContaining({ dob: expect.any(Date) }) }));
  });
});