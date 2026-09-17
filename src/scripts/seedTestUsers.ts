import mongoose from 'mongoose';
import { Role } from '@/enum/role.enum';
import { UserModel } from '@models/User.model';
import { ProfileModel, VerificationStatus } from '@models/Profile.model';
import { ConversationModel, MessageModel } from '@models/Conversation.model';
import { InterestModel } from '@models/Interest.model';
import { MembershipPlanModel } from '@models/MembershipPlan.model';
import { PartnerPreferenceModel } from '@models/PartnerPreference.model';
import { PaymentModel } from '@models/Payment.model';
import { evaluateAccess } from '@services/access.service';
import { compareSecret, hashSecret } from '@utils/password';

const databaseUrl = 'mongodb://127.0.0.1:27017/weour_matrimony';
const defaultPassword = 'Test@12345678';
const maleNames = ['Arun', 'Karthik', 'Praveen', 'Vignesh', 'Sathish', 'Dinesh', 'Naveen', 'Suresh', 'Balaji', 'Saravanan', 'Ganesh', 'Ramesh', 'Vijay', 'Ashwin', 'Senthil'];
const femaleNames = ['Priya', 'Divya', 'Meena', 'Kavya', 'Nithya', 'Revathi', 'Anitha', 'Deepa', 'Janani', 'Keerthana', 'Lakshmi', 'Ramya', 'Swathi', 'Abinaya', 'Sangeetha'];
const districts = ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Erode', 'Tiruppur', 'Thanjavur', 'Karur', 'Namakkal', 'Tiruchirappalli'];
const kulams = ['dheppalu', 'orsulu', 'aalukuttalu', 'ponnanipullu', 'mannarbullu', 'pattukottalu', 'puruvalapullu', 'manchalu', 'kachaipullu', 'koththiparanki', 'seelajanaru', 'ilakkimanu'];
const careers = [
  ['B.E.', 'Software Engineer'], ['MBBS', 'Doctor'], ['MBA', 'Business Analyst'],
  ['B.Com', 'Accountant'], ['M.Sc', 'Teacher'], ['B.Tech', 'Civil Engineer'],
];
interface TestAccount {
  name: string; email: string; mobile: string; role: Role; paid: boolean;
  edge?: { key: string; status: VerificationStatus; accessDays?: number; phoneVerified?: boolean; quick?: boolean; previousStatus?: Exclude<VerificationStatus, 'suspended'>; private?: boolean; adultBoundary?: boolean };
}
const edgeCases: NonNullable<TestAccount['edge']>[] = [
  { key: 'pending-unpaid', status: 'unverified', quick: true, phoneVerified: false },
  { key: 'pending-paid', status: 'unverified', accessDays: 90 },
  { key: 'verified-unpaid', status: 'verified' },
  { key: 'verified-expired', status: 'verified', accessDays: -1 },
  { key: 'rejected-paid', status: 'rejected', accessDays: 90 },
  { key: 'suspended-paid', status: 'suspended', accessDays: 90, previousStatus: 'verified' },
  { key: 'refunded', status: 'refunded', accessDays: -1 },
  { key: 'private-member', status: 'verified', accessDays: 90, private: true },
  { key: 'adult-boundary', status: 'unverified', adultBoundary: true, quick: true },
];
const accounts: TestAccount[] = [
  { name: 'Test Admin', email: 'admin@test.weour.example', mobile: '9000000001', role: Role.Admin, paid: false },
  { name: 'Test Paid Member', email: 'paid@test.weour.example', mobile: '9000000002', role: Role.User, paid: true },
  { name: 'Test Unpaid Member', email: 'unpaid@test.weour.example', mobile: '9000000003', role: Role.User, paid: false },
  ...Array.from({ length: 84 }, (_, index) => ({
    name: `${(index % 2 === 0 ? maleNames : femaleNames)[Math.floor(index / 2) % 15]} ${['Kumar', 'Rajan', 'Prakash'][Math.floor(index / 30)]}`,
    email: `member${String(index + 1).padStart(3, '0')}@test.weour.example`,
    mobile: String(9000010001 + index), role: Role.User, paid: index % 4 < 2,
  })),
  ...edgeCases.map((edge, index) => ({
    name: `QA ${edge.key}`, email: `edge-${edge.key}@test.weour.example`,
    mobile: String(9000090001 + index), role: Role.User,
    paid: edge.status === 'verified' && (edge.accessDays ?? 0) > 0, edge,
  })),
];

type SeedMember = { account: typeof accounts[number]; profile: InstanceType<typeof ProfileModel> };
type Fixture = { modelName: string; document: mongoose.Document; filter: Record<string, unknown> };

function addStories(members: SeedMember[]): void {
  const couples = members.filter(({ profile }) => profile.referenceId.startsWith('TEST-MEMBER-')).slice(-24);
  for (let index = 0; index < couples.length; index += 2) {
    const groom = couples[index].profile;
    const bride = couples[index + 1].profile;
    const storyIndex = index / 2;
    const marriageDate = new Date(Date.UTC(new Date().getUTCFullYear() - storyIndex % 3, storyIndex % 6, 12));
    for (const [profile, partner] of [[groom, bride], [bride, groom]]) {
      profile.marriageStatus = {
        isMarried: true, marriedThroughPlatform: true, partnerProfileId: partner._id,
        marriageDate, marriageNotes: 'Fictional marriage for local screen testing.',
        consentForTestimonial: true, consentForPhotos: true,
        storyStatus: profile === groom ? storyIndex < 8 ? 'published' : storyIndex < 10 ? 'user-submitted' : 'declined' : 'none',
      };
    }
    const title = `${bride.name} & ${groom.name}`;
    const summary = `A fictional success story from ${groom.district}: a shared interest in music brought two families together.`;
    const fullStory = `${summary}\n\nWe discovered each other's profiles and started a conversation about family, work and our hopes for the future. After several calls, our families met in ${groom.district}.\n\nWe celebrated our wedding with close friends and relatives. This is demonstration content for testing the story detail screen, not a real testimonial.`;
    groom.successStory = {
      title, titleTa: `[TA demo] ${title}`, summary, summaryTa: `[TA demo] ${summary}`,
      fullStory, fullStoryTa: `[TA demo] ${fullStory}`, photoIds: [], coverPhotoIndex: 0,
      showNames: storyIndex !== 6, showLocation: storyIndex !== 7,
      brideName: bride.name, groomName: groom.name, location: groom.district,
      marriageDate, publishedDate: marriageDate, featured: storyIndex < 3, viewCount: 50 + storyIndex * 31,
    };
  }
}

function relatedFixtures(members: SeedMember[], plan: InstanceType<typeof MembershipPlanModel>): Fixture[] {
  const fixtures: Fixture[] = [];
  const now = new Date();
  for (const { profile } of members) {
    const preference = new PartnerPreferenceModel({
      userId: profile.userId, ageMin: 23, ageMax: 42, heightMinCm: 150, heightMaxCm: 190,
      preferredKulams: kulams.filter((kulam) => kulam !== profile.kulam),
      preferredDistricts: [profile.district, 'Chennai', 'Coimbatore'],
      preferredEducation: ['B.E.', 'MBA', 'M.Sc'], preferredJobs: ['Software Engineer', 'Teacher'],
    });
    fixtures.push({ modelName: PartnerPreferenceModel.modelName, document: preference, filter: { userId: profile.userId } });
    if (profile.accessTill) {
      const orderId = `demo_order_${profile.referenceId}`;
      const payment = new PaymentModel({
        userId: profile.userId, planId: plan._id, planName: plan.name, amount: plan.priceInr * 100,
        currency: 'INR', durationDays: plan.durationDays, orderId, paymentId: `demo_payment_${profile.referenceId}`,
        status: profile.verificationStatus === 'refunded' ? 'refunded' : 'captured',
        appliedAt: new Date(profile.accessTill.getTime() - plan.durationDays * 86400000),
        accessTill: profile.accessTill,
      });
      fixtures.push({ modelName: PaymentModel.modelName, document: payment, filter: { orderId } });
    }
  }
  const available = members.filter(({ profile }) => !profile.marriageStatus.isMarried && profile.verificationStatus === 'verified');
  const paid = available.filter(({ profile }) => evaluateAccess(profile).hasFullAccess);
  const interestKeys = new Set<string>();
  for (const [targetIndex, target] of available.entries()) {
    const senders = paid.filter(({ profile }) => profile.gender !== target.profile.gender);
    for (let offset = 0; offset < Math.min(5, senders.length); offset++) {
      const sender = senders[(targetIndex + offset) % senders.length];
      const filter = { senderUserId: sender.profile.userId, receiverUserId: target.profile.userId };
      const key = `${filter.senderUserId}:${filter.receiverUserId}`;
      if (interestKeys.has(key)) continue;
      interestKeys.add(key);
      const document = new InterestModel({
        ...filter, senderProfileId: sender.profile._id, targetProfileId: target.profile._id,
        createdAt: new Date(now.getTime() - (targetIndex * 5 + offset) * 3600000),
        ...(offset % 2 === 0 ? { readAt: now } : {}),
      });
      fixtures.push({ modelName: InterestModel.modelName, document, filter });
    }
  }
  const conversationKeys = new Set<string>();
  for (const [memberIndex, member] of paid.entries()) {
    const partners = paid.filter(({ profile }) => profile.gender !== member.profile.gender);
    for (let offset = 0; offset < Math.min(3, partners.length); offset++) {
      const partner = partners[(memberIndex + offset) % partners.length];
      const participants = [member.profile.userId, partner.profile.userId].sort((first, second) => String(first).localeCompare(String(second)));
      const pairKey = participants.join(':');
      if (conversationKeys.has(pairKey)) continue;
      conversationKeys.add(pairKey);
      const conversation = new ConversationModel({ pairKey, participants });
      fixtures.push({ modelName: ConversationModel.modelName, document: conversation, filter: { pairKey } });
      const messages = [
        `Hello ${partner.profile.name}, I enjoyed reading your profile.`,
        `Hi ${member.profile.name}, thank you for getting in touch. How was your week?`,
        `It was good. I work in ${member.profile.district} and enjoy music and travelling.`,
        'We seem to have a lot in common. What do you like doing on weekends?',
        'Usually spending time with family. Would your family be free for a call this weekend?',
        'Saturday afternoon would work well. Let us discuss a time.',
      ];
      for (const [messageIndex, text] of messages.entries()) {
        const senderId = messageIndex % 2 === 0 ? member.profile.userId : partner.profile.userId;
        const clientId = `demo:${pairKey}:${messageIndex}`;
        const document = new MessageModel({
          conversationId: conversation._id, senderId, clientId, text,
          createdAt: new Date(now.getTime() - (30 - messageIndex) * 60000 - memberIndex * 3600000),
          ...(messageIndex < 4 ? { readAt: now } : {}),
        });
        fixtures.push({ modelName: MessageModel.modelName, document, filter: { senderId, clientId } });
      }
    }
  }
  return fixtures;
}

async function run(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Test accounts may only be seeded with NODE_ENV=development.');
  }

  const passwordHash = await hashSecret(defaultPassword);
  const documents = accounts.map((account, index) => {
    const generated = index >= 3 && !account.edge;
    const adultBirthday = new Date();
    adultBirthday.setUTCFullYear(adultBirthday.getUTCFullYear() - 18);
    adultBirthday.setUTCHours(0, 0, 0, 0);
    const memberIndex = index - 3;
    const male = generated ? memberIndex % 2 === 0 : account.paid;
    const district = districts[Math.floor(Math.max(memberIndex, 0) / 2) % districts.length];
    const career = careers[Math.floor(Math.max(memberIndex, 0) / 2) % careers.length];
    const user = new UserModel({
      mobile: account.mobile,
      email: account.email,
      countryCode: '+91',
      role: account.role,
      passwordHash,
      isActive: true,
      isDeleted: false,
      isPhoneVerified: account.edge?.phoneVerified ?? true,
      ...(account.edge?.private ? { preferences: { showPhoto: false, showContact: false, emailNotifications: false } } : {}),
    });
    const profile = account.role === Role.User ? new ProfileModel({
      userId: user._id,
      referenceId: account.edge ? `TEST-EDGE-${account.edge.key.toUpperCase()}` : generated ? `TEST-MEMBER-${String(memberIndex + 1).padStart(3, '0')}` : account.paid ? 'TEST-PAID-001' : 'TEST-UNPAID-001',
      name: account.name,
      gender: male ? 'male' : 'female',
      profileType: male ? 'groom' : 'bride',
      dob: account.edge?.adultBoundary ? adultBirthday : generated ? new Date(Date.UTC(new Date().getUTCFullYear() - 24 - memberIndex % 15, memberIndex % 12, 10)) : new Date('1995-01-01T00:00:00.000Z'),
      heightCm: generated ? 155 + memberIndex % 30 : 170,
      maritalStatus: generated && memberIndex % 13 === 0 ? 'divorced' : generated && memberIndex % 17 === 0 ? 'widowed' : 'never-married',
      registrationType: account.edge?.quick ? 'quick' : 'full',
      registrarName: account.name,
      relationToProfile: 'self',
      email: account.email,
      whatsapp: account.mobile,
      state: 'Tamil Nadu',
      district,
      taluk: district,
      nativePlace: district,
      currentCountry: 'India',
      currentCity: district,
      education: career[0],
      occupation: career[1],
      company: `Demo ${district} Services`,
      annualIncome: ['3-5 Lakhs', '5-10 Lakhs', '10-15 Lakhs', '15-20 Lakhs'][index % 4],
      workLocation: district,
      rasi: ['Mesham', 'Rishabam', 'Mithunam', 'Kadagam'][index % 4],
      star: ['Ashwini', 'Bharani', 'Karthigai', 'Rohini'][index % 4],
      kulam: generated ? kulams[memberIndex % kulams.length] : account.paid ? 'dheppalu' : 'orsulu',
      fatherName: 'Demo Ranganathan',
      motherName: 'Demo Vasanthi',
      siblings: index % 2 === 0 ? 'One married sister' : 'One younger brother',
      familyType: index % 3 === 0 ? 'joint' : 'nuclear',
      otherDetails: 'Fictional test profile. Enjoys music, travel and spending time with family. Looking for a kind, supportive partner.',
      profileViews: 20 + index * 7,
      verificationStatus: account.edge?.status ?? (generated ? ({ 46: 'unverified', 47: 'rejected', 50: 'suspended', 51: 'refunded' } as Record<number, string>)[memberIndex] ?? 'verified' : 'verified'),
      previousVerificationStatus: account.edge?.previousStatus,
      accessTill: account.edge ? (account.edge.accessDays === undefined ? undefined : new Date(Date.now() + account.edge.accessDays * 86400000)) : account.paid ? new Date(Date.now() + 90 * 86400000) : generated && memberIndex % 4 === 3 ? new Date(Date.now() - 10 * 86400000) : undefined,
    }) : null;
    return { account, user, profile };
  });

  const members = documents.filter((entry): entry is typeof entry & SeedMember => entry.profile !== null);
  addStories(members);
  const plan = new MembershipPlanModel({ name: 'Demo 90 Day Membership', priceInr: 20, durationDays: 90, features: ['Local test membership'], isActive: true });
  await plan.validate();
  const fixtures = relatedFixtures(members, plan);
  for (const fixture of fixtures) await fixture.document.validate();
  for (const { account, user, profile } of documents) {
    await user.validate();
    await profile?.validate();
    if (!user.passwordHash || !await compareSecret(defaultPassword, user.passwordHash)) throw new Error('Password verification failed');
    if (profile && evaluateAccess(profile).hasFullAccess !== account.paid) throw new Error('Incorrect test entitlement');
  }
  if (process.argv.includes('--check')) {
    console.log(`All ${documents.length} test accounts and ${fixtures.length} related records pass model, password and access validation. No database writes.`);
    return;
  }

  await mongoose.connect(databaseUrl, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([UserModel.init(), ProfileModel.init(), MembershipPlanModel.init(), PartnerPreferenceModel.init(), PaymentModel.init(), InterestModel.init(), ConversationModel.init(), MessageModel.init()]);

  for (const { account, profile } of documents) {
    const existing = await UserModel.find({ $or: [{ mobile: account.mobile }, { email: account.email }] });
    if (existing.some((user) => user.email !== account.email || user.mobile !== account.mobile || user.role !== account.role || user.isDeleted || !user.isActive)) {
      throw new Error(`Account collision for ${account.email}; no existing users will be overwritten.`);
    }
    if (profile) {
      const existingProfile = await ProfileModel.findOne({ referenceId: profile.referenceId });
      if (existingProfile && !existing.some((user) => String(user._id) === String(existingProfile.userId))) {
        throw new Error(`Profile reference collision for ${profile.referenceId}`);
      }
    }
  }

  const savedMembers: SeedMember[] = [];
  for (const { account, user, profile } of documents) {
    const existing = await UserModel.findOne({ mobile: account.mobile });
    const savedUser = existing ?? await user.save();
    if (profile && !await ProfileModel.exists({ userId: savedUser._id })) {
      profile.userId = savedUser._id;
      await profile.save();
    }
    const verifiedUser = await UserModel.findById(savedUser._id).select('+passwordHash');
    if (!verifiedUser) throw new Error(`Seeded user not found for ${account.email}`);
    if (!verifiedUser.passwordHash) throw new Error(`Password hash missing for ${account.email}`);
    const savedProfile = await ProfileModel.findOne({ userId: savedUser._id });
    if (savedProfile && profile && !account.edge && !profile.referenceId.startsWith('TEST-MEMBER-')) {
      for (const field of ['whatsapp', 'taluk', 'nativePlace', 'currentCountry', 'currentCity', 'company', 'annualIncome', 'workLocation', 'fatherName', 'motherName', 'siblings', 'familyType', 'otherDetails'] as const) {
        if (!savedProfile.get(field)) savedProfile.set(field, profile.get(field));
      }
      if (savedProfile.isModified()) await savedProfile.save();
    }
    if (savedProfile) savedMembers.push({ account, profile: savedProfile });
    if (!process.argv.includes('--quiet')) console.log(JSON.stringify({
      email: account.email,
      mobile: account.mobile,
      role: verifiedUser.role,
      result: existing ? 'preserved existing account' : 'created',
      defaultPasswordMatches: await compareSecret(defaultPassword, verifiedUser.passwordHash),
      access: evaluateAccess(savedProfile, verifiedUser.role),
    }));
  }

  const savedPlan = await MembershipPlanModel.findOneAndUpdate(
    { name: plan.name }, { $setOnInsert: plan.toObject() }, { upsert: true, new: true, runValidators: true },
  );
  const savedFixtures = relatedFixtures(savedMembers, savedPlan!);
  const conversationIds = new Map<string, mongoose.Types.ObjectId>();
  for (const fixture of savedFixtures) {
    if (fixture.modelName === MessageModel.modelName) {
      const message = fixture.document as InstanceType<typeof MessageModel>;
      message.conversationId = conversationIds.get(String(message.conversationId))!;
    }
    await fixture.document.validate();
    const model = mongoose.model(fixture.modelName);
    const saved = await model.findOneAndUpdate(fixture.filter, { $setOnInsert: fixture.document.toObject() }, { upsert: true, new: true, runValidators: true });
    if (fixture.modelName === ConversationModel.modelName) conversationIds.set(String(fixture.document._id), saved!._id);
  }
  const userIds = savedMembers.map(({ profile }) => profile.userId);
  console.log(JSON.stringify({
    edgeCases: savedMembers.filter(({ account }) => account.edge).map(({ account, profile }) => ({ mobile: account.mobile, scenario: account.edge!.key, referenceId: profile.referenceId, status: profile.verificationStatus, hasFullAccess: evaluateAccess(profile).hasFullAccess })),
    members: savedMembers.length,
    paid: savedMembers.filter(({ profile }) => evaluateAccess(profile).hasFullAccess).length,
    unpaid: savedMembers.filter(({ profile }) => !evaluateAccess(profile).hasFullAccess).length,
    searchable: savedMembers.filter(({ profile }) => ['unverified', 'verified'].includes(profile.verificationStatus) && !profile.marriageStatus.isMarried).length,
    publishedStories: savedMembers.filter(({ profile }) => profile.marriageStatus.storyStatus === 'published').length,
    preferences: await PartnerPreferenceModel.countDocuments({ userId: { $in: userIds } }),
    interests: await InterestModel.countDocuments({ senderUserId: { $in: userIds }, receiverUserId: { $in: userIds } }),
    conversations: await ConversationModel.countDocuments({ participants: { $in: userIds } }),
    messages: await MessageModel.countDocuments({ senderId: { $in: userIds }, clientId: /^demo:/ }),
    payments: await PaymentModel.countDocuments({ userId: { $in: userIds }, orderId: /^demo_order_/ }),
  }, null, 2));
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());