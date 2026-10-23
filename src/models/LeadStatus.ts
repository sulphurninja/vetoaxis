import mongoose from "mongoose";

const leadStatusSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, uppercase: true },
    label: { type: String, required: true, trim: true },
    color: { type: String, default: "#64748b" },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

leadStatusSchema.index({ key: 1 }, { unique: true });

export default mongoose.models.LeadStatus || mongoose.model("LeadStatus", leadStatusSchema);
