import { Schema, Types, model } from 'mongoose';

export interface IAuditLog {
  actorId: Types.ObjectId; action: string; targetId: string; reason: string;
  details: Record<string, unknown>; createdAt: Date;
}
const auditLogSchema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, targetId: { type: String, required: true },
  reason: { type: String, default: '' }, details: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false } });
auditLogSchema.index({ createdAt: -1 });
export const AuditLogModel = model<IAuditLog>('AuditLog', auditLogSchema);