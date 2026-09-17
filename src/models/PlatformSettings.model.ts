import { Schema, model } from 'mongoose';

export interface IPlatformSettings {
  key: string; platformName: string; tagline: string; supportEmail: string;
  supportPhone: string; whatsapp: string; workingDays: string; workingHours: string;
}
const platformSettingsSchema = new Schema<IPlatformSettings>({
  key: { type: String, default: 'platform', unique: true },
  platformName: { type: String, default: 'WeOur Matrimony' }, tagline: { type: String, default: '' },
  supportEmail: { type: String, default: '' }, supportPhone: { type: String, default: '' },
  whatsapp: { type: String, default: '' }, workingDays: { type: String, default: '' }, workingHours: { type: String, default: '' },
}, { timestamps: true });
export const PlatformSettingsModel = model<IPlatformSettings>('PlatformSettings', platformSettingsSchema);