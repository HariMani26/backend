import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../app';
import { AuditLogModel } from '@models/AuditLog.model';
import { PartnerPreferenceModel } from '@models/PartnerPreference.model';
import { ProfileModel } from '@models/Profile.model';
import { UserModel } from '@models/User.model';
import { UploadedFileModel } from '@models/UploadedFile.model';
import { evaluateAccess } from './access.service';
import { tokenService } from './token.service';
import { uploadService } from './upload.service';
import { Role } from '../enum/role.enum';

describe('Admin workflow on an isolated MongoDB replica set', () => {
  let replica: MongoMemoryReplSet;
  let adminId: string;
  let token: string;
  const app = createApp();
  const payload = {
    mobile: '9000080001', consentConfirmed: true, reason: 'Member requested registration',
    profile: { name: 'Manual Member', gender: 'female', dob: '1995-01-01', district: 'Chennai', registrarName: 'Member Parent', relationToProfile: 'mother' },
  };
  const create = (body = payload) => request(app).post('/api/admin/users').set('Authorization', `Bearer ${token}`).send(body);
  const moderate = (id: string, action: string) => request(app).post(`/api/admin/users/${id}/moderate`).set('Authorization', `Bearer ${token}`).send({ action, reason: 'Identity reviewed by test admin' });

  beforeAll(async () => {
    replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    await mongoose.connect(replica.getUri('admin_workflow_test'));
    await Promise.all([UserModel.init(), ProfileModel.init(), PartnerPreferenceModel.init(), AuditLogModel.init()]);
  }, 180000);

  beforeEach(async () => {
    await Promise.all([UserModel.deleteMany({}), ProfileModel.deleteMany({}), PartnerPreferenceModel.deleteMany({}), AuditLogModel.deleteMany({}), UploadedFileModel.deleteMany({})]);
    const admin = await UserModel.create({ mobile: '9000080000', role: 'admin', isActive: true, isPhoneVerified: true });
    adminId = String(admin._id);
    token = tokenService.signAccessTokenFor(adminId, admin.role);
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => { await mongoose.disconnect(); await replica?.stop(); });

  it('persists an unverified unpaid member, preferences and audit record together', async () => {
    const response = await create();
    expect(response.status).toBe(201);
    const user = await UserModel.findOne({ mobile: payload.mobile });
    const profile = await ProfileModel.findById(response.body.data.id);
    expect(user?.role).toBe('user');
    expect(user?.isPhoneVerified).toBe(false);
    expect(String(user?.createdBy)).toBe(adminId);
    expect(profile?.registrationType).toBe('quick');
    expect(profile?.verificationStatus).toBe('unverified');
    expect(profile?.accessTill).toBeUndefined();
    expect(profile?.referenceId).toMatch(/^WOM\d{5,}$/);
    expect(await PartnerPreferenceModel.countDocuments({ userId: user!._id })).toBe(1);
    expect(await AuditLogModel.countDocuments({ action: 'profile.create', targetId: response.body.data.id })).toBe(1);
  });

  it('loads a quick registration and its preferences for admin completion', async () => {
    const created = await create();
    const response = await request(app).get(`/api/admin/users/${created.body.data.id}/registration`).set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.profile).toMatchObject({ id: created.body.data.id, name: payload.profile.name, registrationType: 'quick', mobile: payload.mobile });
    expect(response.body.data.partnerPreference).toMatchObject({ ageMin: 21, ageMax: 31 });
  });

  const fullProfile = {
    ...payload.profile, heightCm: 165, maritalStatus: 'never-married', education: 'BSc', occupation: 'Teacher',
    rasi: 'Rishabam', star: 'Rohini', kulam: 'other', familyType: 'nuclear', fatherName: 'Member Father',
    partnerPreference: { ageMin: 25, ageMax: 35, preferredDistricts: ['Chennai'] },
  };
  const completeRegistration = (id: string, profile = fullProfile) => request(app).put(`/api/admin/users/${id}/registration`).set('Authorization', `Bearer ${token}`).send({ profile, reason: 'Customer supplied remaining details' });
  const addPhoto = (userId: string) => UploadedFileModel.create({ userId, type: 'profile-image', container: 'profile-images', blobName: `${userId}/photo.jpg`, originalName: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: 100, isPrimary: true });

  it('completes the same customer with preferences without granting verification or access', async () => {
    const created = (await create()).body.data;
    await addPhoto(created.userId);
    const response = await completeRegistration(created.id);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: created.id, userId: created.userId, referenceId: created.referenceId, registrationType: 'full', verificationStatus: 'unverified', fatherName: 'Member Father' });
    expect(await ProfileModel.countDocuments()).toBe(1);
    expect(await UserModel.countDocuments({ role: 'user' })).toBe(1);
    expect((await ProfileModel.findById(created.id))?.accessTill).toBeUndefined();
    expect(await PartnerPreferenceModel.findOne({ userId: created.userId })).toMatchObject({ ageMin: 25, ageMax: 35, preferredDistricts: ['Chennai'] });
    expect(await AuditLogModel.countDocuments({ action: 'profile.complete-registration', actorId: adminId, targetId: created.id })).toBe(1);
    expect((await completeRegistration(created.id)).status).toBe(409);
  });

  it('completes a customer-submitted quick registration without creating another account', async () => {
    const owner = await UserModel.create({ mobile: payload.mobile, role: Role.User, isActive: true, isPhoneVerified: true });
    const memberToken = tokenService.signAccessTokenFor(String(owner._id), Role.User);
    const quick = await request(app).post('/api/registrations/quick').set('Authorization', `Bearer ${memberToken}`).send(payload.profile);
    expect(quick.status).toBe(201);
    const created = quick.body.data;
    await addPhoto(String(owner._id));
    const response = await completeRegistration(created.id);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: created.id, userId: String(owner._id), referenceId: created.referenceId, registrationType: 'full' });
    expect(await UserModel.countDocuments({ mobile: payload.mobile })).toBe(1);
    expect(await ProfileModel.countDocuments({ userId: owner._id })).toBe(1);
    expect((await UserModel.findById(owner._id))?.isPhoneVerified).toBe(true);
  });

  it('requires the customer photo and complete valid details', async () => {
    const created = (await create()).body.data;
    await addPhoto(adminId);
    expect((await completeRegistration(created.id)).status).toBe(400);
    await addPhoto(created.userId);
    expect((await completeRegistration(created.id, { ...fullProfile, education: '' })).status).toBe(400);
    expect((await completeRegistration(created.id, { ...fullProfile, dob: '2020-01-01' })).status).toBe(400);
    expect((await ProfileModel.findById(created.id))?.registrationType).toBe('quick');
  });

  it('rolls back completion and preferences when audit writing fails', async () => {
    const created = (await create()).body.data;
    await addPhoto(created.userId);
    jest.spyOn(AuditLogModel, 'create').mockRejectedValueOnce(new Error('Simulated audit failure'));
    expect((await completeRegistration(created.id)).status).toBe(500);
    expect((await ProfileModel.findById(created.id))?.registrationType).toBe('quick');
    expect((await PartnerPreferenceModel.findOne({ userId: created.userId }))?.ageMin).toBe(21);
  });

  it('scopes admin uploads to the customer and rejects cross-customer file changes', async () => {
    const created = (await create()).body.data;
    const photo = await addPhoto(created.userId);
    const upload = jest.spyOn(uploadService, 'uploadPhoto').mockResolvedValue(photo);
    const response = await request(app).post(`/api/admin/users/${created.id}/uploads/profile-image`).set('Authorization', `Bearer ${token}`).attach('file', Buffer.from('test-photo'), { filename: 'photo.jpg', contentType: 'image/jpeg' });
    expect(response.status).toBe(201);
    expect(upload).toHaveBeenCalledWith(created.userId, 'profile-image', expect.objectContaining({ originalname: 'photo.jpg' }));
    const foreignPhoto = await addPhoto(adminId);
    expect((await request(app).delete(`/api/admin/users/${created.id}/uploads/${foreignPhoto._id}`).set('Authorization', `Bearer ${token}`)).status).toBe(404);
    const remove = jest.spyOn(uploadService, 'deleteFile').mockResolvedValue();
    expect((await request(app).delete(`/api/admin/users/${created.id}/uploads/${photo._id}`).set('Authorization', `Bearer ${token}`)).status).toBe(200);
    expect(remove).toHaveBeenCalledWith(created.userId, String(photo._id));
  });

  it('denies member access to admin registration and upload endpoints', async () => {
    const created = (await create()).body.data;
    const memberToken = tokenService.signAccessTokenFor(created.userId, Role.User);
    for (const suffix of ['registration', 'uploads']) {
      expect((await request(app).get(`/api/admin/users/${created.id}/${suffix}`).set('Authorization', `Bearer ${memberToken}`)).status).toBe(403);
    }
    await UserModel.updateOne({ _id: created.userId }, { role: 'admin' });
    expect((await request(app).get(`/api/admin/users/${created.id}/registration`).set('Authorization', `Bearer ${token}`)).status).toBe(403);
  });

  it('combines user filters before pagination and searches admin-visible mobile numbers', async () => {
    const first = await create();
    await create({ ...payload, mobile: '9000080002', profile: { ...payload.profile, name: 'Another Member' } });
    const elsewhere = await create({ ...payload, mobile: '9000080003', profile: { ...payload.profile, name: 'Other Member', district: 'Salem' } });
    await ProfileModel.updateOne({ _id: first.body.data.id }, { 'marriageStatus.isMarried': true, 'marriageStatus.marriedThroughPlatform': true });
    await ProfileModel.updateOne({ _id: elsewhere.body.data.id }, { 'marriageStatus.isMarried': true, 'marriageStatus.marriedThroughPlatform': false });
    const list = (query: Record<string, string | number>) => request(app).get('/api/admin/users').query(query).set('Authorization', `Bearer ${token}`);
    const response = await list({ district: 'Chennai', gender: 'female', registrationType: 'quick', sortBy: 'name', sortDirection: 'asc', page: 2, limit: 1 });
    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(2);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toMatchObject({ name: 'Manual Member', mobile: payload.mobile });
    expect(response.body.data.districts).toEqual(['Chennai', 'Salem']);
    expect((await list({ search: '80003' })).body.data.items[0].name).toBe('Other Member');
    expect((await list({ marriage: 'platform' })).body.data.items[0].name).toBe('Manual Member');
    expect((await list({ marriage: 'elsewhere' })).body.data.items[0].name).toBe('Other Member');
    expect((await list({ marriage: 'unmarried' })).body.data.items[0].name).toBe('Another Member');
    expect((await list({ ageMin: 90 })).body.data.total).toBe(0);
    expect((await list({ ageMin: 40, ageMax: 20 })).status).toBe(400);
  });

  it('approves, suspends and restores paid membership without changing its expiry', async () => {
    const response = await create();
    const id = response.body.data.id;
    const expiry = new Date(Date.now() + 86400000);
    await ProfileModel.updateOne({ _id: id }, { accessTill: expiry });
    expect(evaluateAccess(await ProfileModel.findById(id)).hasFullAccess).toBe(false);
    expect((await moderate(id, 'approve')).status).toBe(200);
    expect(evaluateAccess(await ProfileModel.findById(id)).hasFullAccess).toBe(true);
    expect((await moderate(id, 'suspend')).status).toBe(200);
    expect(evaluateAccess(await ProfileModel.findById(id)).hasFullAccess).toBe(false);
    expect((await moderate(id, 'approve')).status).toBe(409);
    expect((await moderate(id, 'unsuspend')).status).toBe(200);
    const restored = await ProfileModel.findById(id);
    expect(restored?.accessTill).toEqual(expiry);
    expect(evaluateAccess(restored).hasFullAccess).toBe(true);
    expect(await AuditLogModel.countDocuments({ targetId: id })).toBe(4);
  });

  it('approval does not grant access to unpaid or expired members', async () => {
    const response = await create();
    const id = response.body.data.id;
    expect((await moderate(id, 'approve')).status).toBe(200);
    expect(evaluateAccess(await ProfileModel.findById(id)).hasFullAccess).toBe(false);
    await ProfileModel.updateOne({ _id: id }, { accessTill: new Date('2020-01-01') });
    expect((await moderate(id, 'approve')).status).toBe(200);
    expect(evaluateAccess(await ProfileModel.findById(id)).reason).toBe('expired');
  });

  it('rejects and soft deletes a member and prevents reuse of its account', async () => {
    const response = await create();
    const id = response.body.data.id;
    expect((await moderate(id, 'reject')).status).toBe(200);
    expect((await ProfileModel.findById(id))?.verificationStatus).toBe('rejected');
    expect((await moderate(id, 'delete')).status).toBe(200);
    expect((await ProfileModel.findById(id))?.isDeleted).toBe(true);
    const owner = await UserModel.findOne({ mobile: payload.mobile });
    expect(owner?.isDeleted).toBe(true);
    expect(owner?.isActive).toBe(false);
    expect((await create()).status).toBe(409);
    expect((await moderate(id, 'approve')).status).toBe(404);
  });

  it('prevents concurrent duplicate mobile submissions from leaving partial records', async () => {
    const responses = await Promise.all([create(), create()]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await UserModel.countDocuments({ mobile: payload.mobile })).toBe(1);
    expect(await ProfileModel.countDocuments()).toBe(1);
    expect(await PartnerPreferenceModel.countDocuments()).toBe(1);
    expect(await AuditLogModel.countDocuments()).toBe(1);
  });

  it('rolls back all member records if audit writing fails', async () => {
    jest.spyOn(AuditLogModel, 'create').mockRejectedValueOnce(new Error('Simulated audit failure'));
    expect((await create()).status).toBe(500);
    expect(await UserModel.countDocuments({ mobile: payload.mobile })).toBe(0);
    expect(await ProfileModel.countDocuments()).toBe(0);
    expect(await PartnerPreferenceModel.countDocuments()).toBe(0);
  });

  it('rolls back an approval if its audit record cannot be saved', async () => {
    const response = await create();
    jest.spyOn(AuditLogModel, 'create').mockRejectedValueOnce(new Error('Simulated audit failure'));
    expect((await moderate(response.body.data.id, 'approve')).status).toBe(500);
    expect((await ProfileModel.findById(response.body.data.id))?.verificationStatus).toBe('unverified');
    expect(await AuditLogModel.countDocuments()).toBe(1);
  });

  it('rejects malformed IDs and prevents moderation of administrator-owned profiles', async () => {
    expect((await moderate('invalid-id', 'approve')).status).toBe(400);
    const response = await create();
    const profile = await ProfileModel.findById(response.body.data.id);
    await UserModel.updateOne({ _id: profile!.userId }, { role: 'admin' });
    expect((await moderate(response.body.data.id, 'approve')).status).toBe(403);
    expect((await ProfileModel.findById(response.body.data.id))?.verificationStatus).toBe('unverified');
  });
});