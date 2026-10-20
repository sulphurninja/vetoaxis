import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI before running this script.");
}

const normalizeEmail = (value) => {
  if (!value) return "";
  return String(value).trim().toLowerCase();
};

const normalizePhone = (value) => {
  if (!value) return "";
  return String(value).replace(/\D/g, "");
};

const leadSchema = new mongoose.Schema({}, { strict: false, collection: "leads" });
const Lead = mongoose.models.LeadBackfill || mongoose.model("LeadBackfill", leadSchema);

async function run() {
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });

  const cursor = Lead.find({}, {
    _id: 1,
    email: 1,
    phone: 1,
    firstName: 1,
    lastName: 1,
    streetAddress: 1,
    city: 1,
    state: 1,
    zipCode: 1,
    address: 1,
  }).cursor();
  const ops = [];
  let scanned = 0;
  let updated = 0;

  for await (const lead of cursor) {
    scanned += 1;
    const emailNormalized = normalizeEmail(lead.email);
    const phoneNormalized = normalizePhone(lead.phone);
    const fullNameNormalized = `${lead.firstName || ""} ${lead.lastName || ""}`.trim().toLowerCase().replace(/\s+/g, " ");
    const addressSource = [lead.streetAddress, lead.city, lead.state, lead.zipCode].filter(Boolean).join(", ") || lead.address || "";
    const addressNormalized = String(addressSource).trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

    ops.push({
      updateOne: {
        filter: { _id: lead._id },
        update: {
          $set: {
            emailNormalized: emailNormalized || null,
            phoneNormalized: phoneNormalized || null,
            fullNameNormalized: fullNameNormalized || null,
            addressNormalized: addressNormalized || null,
          },
        },
      },
    });

    if (ops.length >= 500) {
      const result = await Lead.bulkWrite(ops, { ordered: false });
      updated += result.modifiedCount || 0;
      ops.length = 0;
    }
  }

  if (ops.length > 0) {
    const result = await Lead.bulkWrite(ops, { ordered: false });
    updated += result.modifiedCount || 0;
  }

  for (const indexName of ["org_emailNormalized_unique", "org_phoneNormalized_unique"]) {
    try {
      await Lead.collection.dropIndex(indexName);
    } catch {
      // Index may not exist. Duplicate checks are enforced in the API with a clear error.
    }
  }

  await Lead.collection.createIndex({ fullNameNormalized: 1 });
  await Lead.collection.createIndex({ addressNormalized: 1 });
  await Lead.collection.createIndex({ emailNormalized: 1 });
  await Lead.collection.createIndex({ phoneNormalized: 1 });

  console.log(`Scanned: ${scanned}, Updated: ${updated}`);
  console.log("Backfill complete and indexes created.");
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Backfill failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
