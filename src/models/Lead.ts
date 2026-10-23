// models/Lead.ts
import mongoose from "mongoose";

const statusHistorySchema = new mongoose.Schema({
  fromStatus: String,
  toStatus: String,
  notes: String,
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  timestamp: { type: Date, default: Date.now },
});

// Dynamic field schema
const dynamicFieldSchema = new mongoose.Schema({
  key: String,
  value: String,
});

const leadSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  fullNameNormalized: String,
  phone: String,
  phoneNormalized: String,
  email: String,
  emailNormalized: String,
  dateOfBirth: Date,
  address: String,
  streetAddress: String,
  city: String,
  state: String,
  zipCode: String,
  addressNormalized: String,
  applicationType: String,
  lawsuit: String,
  notes: String,
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  fields: [dynamicFieldSchema], // Array of dynamic fields
  status: { type: String, default: "PENDING" },
  statusHistory: [statusHistorySchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  buyerCode: { type: String },
}, { timestamps: true });

// Indexes to speed up filtering by creator and buyer code
leadSchema.index({ createdBy: 1, createdAt: -1 });
leadSchema.index({ buyerCode: 1, createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ applicationType: 1, createdAt: -1 });
leadSchema.index({ organizationId: 1, fullNameNormalized: 1 });
leadSchema.index({ organizationId: 1, addressNormalized: 1 });
leadSchema.index({ organizationId: 1, emailNormalized: 1 });
leadSchema.index({ organizationId: 1, phoneNormalized: 1 });

const LeadModel = mongoose.models.Lead || mongoose.model("Lead", leadSchema);
const statusPath = LeadModel.schema.path("status");
if (statusPath?.validators) {
  statusPath.validators = statusPath.validators.filter((validator: { type?: string }) => validator.type !== "enum");
  if (statusPath.options) delete statusPath.options.enum;
}
export default LeadModel;
