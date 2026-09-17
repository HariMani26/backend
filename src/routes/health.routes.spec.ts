import request from 'supertest';

import { createApp } from '../app';
import { UserModel } from '@models/User.model';
import { tokenService } from '@services/token.service';
import { ProfileModel } from '@models/Profile.model';
import { profileService } from '@services/profile.service';
import { toProfileDetail } from '@utils/serializers';

describe('GET /api/health', () => {
  const app = createApp();

  it('returns the standard success envelope with status ok', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Service healthy',
      data: {
        status: 'ok',
        timestamp: expect.any(String),
      },
    });
  });
});

describe('GET /api/unknown-route', () => {
  const app = createApp();

  it('returns the standard error envelope with a 404', async () => {
    const response = await request(app).get('/api/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found: GET /api/unknown-route',
      errors: [],
    });
  });
});

describe('Application route composition', () => {
  const app = createApp();

  it.each([
    '/api/auth/me',
    '/api/profiles/me',
    '/api/registrations/draft',
    '/api/search',
    '/api/matches/top',
    '/api/partner-preferences',
    '/api/uploads',
    '/profiles/me',
  ])('mounts %s behind authentication', async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(401);
  });

  it.each(['/api/auth/otp/request', '/auth/otp/request'])(
    'mounts %s with request validation',
    async (path) => {
      const response = await request(app).post(path).send({});

      expect(response.status).toBe(400);
    },
  );
});

describe('GET /api/auth/me', () => {
  const app = createApp();

  afterEach(() => jest.restoreAllMocks());

  it('returns the active caller without private authentication fields', async () => {
    const user = new UserModel({
      mobile: '9000000001',
      isActive: true,
      passwordHash: 'private-password-hash',
    });
    const lookup = jest.spyOn(UserModel, 'findOne').mockResolvedValue(user);
    const token = tokenService.signAccessTokenFor(String(user._id), user.role);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.mobile).toBe(user.mobile);
    expect(response.body.data).not.toHaveProperty('passwordHash');
    expect(response.body.data).not.toHaveProperty('resetPasswordTokenHash');
    expect(lookup).toHaveBeenCalledWith({
      _id: String(user._id),
      isDeleted: { $ne: true },
    });
  });

  it.each([false, true])('rejects unavailable or inactive accounts (inactive: %s)', async (inactive) => {
    const user = new UserModel({ mobile: '9000000001', isActive: false });
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(inactive ? user : null);
    const token = tokenService.signAccessTokenFor(String(user._id), user.role);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});

describe('Guest profile privacy', () => {
  const app = createApp();
  const profile = new ProfileModel({
    name: 'Example Member', referenceId: 'WOM10001', dob: new Date('1998-01-01'),
    whatsapp: '9000000001', email: 'private@example.com', fatherName: 'Private Name',
    primaryPhotoId: '507f1f77bcf86cd799439011',
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns guest summaries without photo URLs or contact data', async () => {
    const search = jest.spyOn(profileService, 'search').mockResolvedValue({ items: [profile], total: 1 });
    const response = await request(app).get('/api/browse');
    expect(response.status).toBe(200);
    expect(search).toHaveBeenCalledWith({ publicOnly: true }, 1, 20);
    expect(response.body.data.items[0].name).toBe(profile.name);
    for (const field of ['photoUrl', 'email', 'whatsapp', 'fatherName', 'primaryPhotoId', 'userId']) {
      expect(response.body.data.items[0]).not.toHaveProperty(field);
    }
  });

  it('returns a locked guest detail through a public visibility lookup', async () => {
    const lookup = jest.spyOn(profileService, 'findPublicById').mockResolvedValue(profile);
    const response = await request(app).get(`/api/browse/${profile._id}`);
    expect(response.status).toBe(200);
    expect(lookup).toHaveBeenCalledWith(String(profile._id));
    expect(response.body.data.hasFullAccess).toBe(false);
    expect(response.body.data.photoUrls).toEqual([]);
    expect(response.body.data).not.toHaveProperty('whatsapp');
    expect(response.body.data).not.toHaveProperty('email');
  });

  it('never exposes a summary photo when detail access is locked', () => {
    const detail = toProfileDetail(profile, { hasFullAccess: false, photoUrls: ['https://private.example/photo?sas=secret'] });
    expect(detail.photoUrl).toBeUndefined();
    expect(detail.photoUrls).toEqual([]);
  });

  it('does not return hidden or missing profiles', async () => {
    jest.spyOn(profileService, 'findPublicById').mockResolvedValue(null);
    const response = await request(app).get(`/api/browse/${profile._id}`);
    expect(response.status).toBe(404);
  });

  it('validates public filters and identifiers', async () => {
    expect((await request(app).get('/api/browse?limit=1000')).status).toBe(400);
    expect((await request(app).get('/api/browse/not-an-id')).status).toBe(400);
  });
});
