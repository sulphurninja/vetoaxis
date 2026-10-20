import Lead from '@/models/Lead';
import {
  FieldValidationError,
  WITNESS_EMAIL_KEYS,
  WITNESS_PHONE_KEYS,
  escapeRegex,
  exactTextQuery,
  flexiblePhoneQuery,
  getWitnessDetails,
  normalizeAddress,
  normalizeEmail,
  normalizePhone,
  normalizeText,
} from '@/lib/lead-utils';

export type LeadDuplicateResult = {
  isDuplicate: boolean;
  duplicateReason: string;
  fieldErrors: FieldValidationError[];
  existingLeadInfo: {
    id: unknown;
    name: string;
    status: string;
    createdBy: string;
    createdAt: Date;
  } | null;
};

const buildLeadInfo = (lead: any) => ({
  id: lead._id,
  name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
  status: lead.status,
    createdBy: lead.createdBy?.vendorCode || '',
  createdAt: lead.createdAt,
});

let duplicateValuesAllowed = false;

export async function allowStoredDuplicates() {
  if (duplicateValuesAllowed) return;
  const indexes = await Lead.collection.indexes();
  const blocking = indexes.filter(index => {
    if (!index.unique || !index.name) return false;
    return Object.keys(index.key || {}).some(key =>
      ['email', 'emailNormalized', 'phone', 'phoneNormalized'].includes(key)
    );
  });
  await Promise.all(blocking.map(index => Lead.collection.dropIndex(index.name as string).catch(() => undefined)));
  duplicateValuesAllowed = true;
}

const pushUnique = (errors: FieldValidationError[], error: FieldValidationError) => {
  if (errors.some(item => item.field === error.field && item.message === error.message)) return;
  errors.push(error);
};

export const findDuplicateLead = async ({
  email,
  phone,
  address,
  fields,
  firstName,
  lastName,
  excludeLeadId,
}: {
  decoded?: any;
  user?: any;
  email?: string | null;
  phone?: string | null;
  address?: {
    streetAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    address?: string | null;
  };
  fields?: unknown;
  firstName?: string | null;
  lastName?: string | null;
  excludeLeadId?: string | null;
}): Promise<LeadDuplicateResult> => {
  const emailNormalized = normalizeEmail(email);
  const phoneNormalized = normalizePhone(phone);
  const addressNormalized = address ? normalizeAddress(address) : '';
  const fullNameNormalized = normalizeText(`${firstName || ''} ${lastName || ''}`);
  const witness = getWitnessDetails(fields);
  const witnessPhoneNormalized = normalizePhone(witness.phone);
  const witnessEmailNormalized = normalizeEmail(witness.email);
  const conditions: any[] = [];
  const fieldErrors: FieldValidationError[] = [];

  if (fullNameNormalized && normalizeText(firstName) && normalizeText(lastName)) {
    conditions.push({ fullNameNormalized });
    conditions.push({
      $and: [
        { firstName: exactTextQuery(String(firstName)) },
        { lastName: exactTextQuery(String(lastName)) },
      ],
    });
  }

  if (phoneNormalized) {
    conditions.push({ phoneNormalized });
    conditions.push({ phone: flexiblePhoneQuery(phoneNormalized) });
    conditions.push({
      fields: {
        $elemMatch: {
          key: { $in: WITNESS_PHONE_KEYS },
          value: flexiblePhoneQuery(phoneNormalized),
        },
      },
    });
  }

  if (emailNormalized) {
    conditions.push({ emailNormalized });
    conditions.push({ email: exactTextQuery(emailNormalized) });
    conditions.push({
      fields: {
        $elemMatch: {
          key: { $in: WITNESS_EMAIL_KEYS },
          value: exactTextQuery(emailNormalized),
        },
      },
    });
  }

  if (addressNormalized) {
    conditions.push({ addressNormalized });
    conditions.push({
      address: {
        $regex: addressNormalized.split(' ').filter(Boolean).map(part => escapeRegex(part)).join('\\W+'),
        $options: 'i',
      },
    });
    const street = (address?.streetAddress || '').trim();
    const city = (address?.city || '').trim();
    const state = (address?.state || '').trim();
    const zipCode = (address?.zipCode || '').trim();
    if (street && city && state && zipCode) {
      conditions.push({
        $and: [
          { streetAddress: exactTextQuery(street) },
          { city: exactTextQuery(city) },
          { state: exactTextQuery(state) },
          { zipCode: exactTextQuery(zipCode) },
        ],
      });
    }
  }

  if (witnessPhoneNormalized) {
    conditions.push({ phoneNormalized: witnessPhoneNormalized });
    conditions.push({ phone: flexiblePhoneQuery(witnessPhoneNormalized) });
    conditions.push({
      fields: {
        $elemMatch: {
          key: { $in: WITNESS_PHONE_KEYS },
          value: flexiblePhoneQuery(witnessPhoneNormalized),
        },
      },
    });
  }

  if (witnessEmailNormalized) {
    conditions.push({ emailNormalized: witnessEmailNormalized });
    conditions.push({ email: exactTextQuery(witnessEmailNormalized) });
    conditions.push({
      fields: {
        $elemMatch: {
          key: { $in: WITNESS_EMAIL_KEYS },
          value: exactTextQuery(witnessEmailNormalized),
        },
      },
    });
  }

  if (conditions.length === 0) {
    return { isDuplicate: false, duplicateReason: '', fieldErrors, existingLeadInfo: null };
  }

  const query: any = { $or: conditions };
  if (excludeLeadId) query._id = { $ne: excludeLeadId };

  const matches: any[] = await Lead.find(query)
    .select('_id firstName lastName status createdBy createdAt phone phoneNormalized email emailNormalized address addressNormalized streetAddress city state zipCode fullNameNormalized fields')
    .populate('createdBy', 'vendorCode')
    .limit(8)
    .lean();

  if (matches.length === 0) {
    return { isDuplicate: false, duplicateReason: '', fieldErrors, existingLeadInfo: null };
  }

  matches.forEach(duplicate => {
    const duplicateWitness = getWitnessDetails(duplicate.fields);
    const duplicatePhone = duplicate.phoneNormalized || normalizePhone(duplicate.phone);
    const duplicateWitnessPhone = normalizePhone(duplicateWitness.phone);
    const duplicateEmail = duplicate.emailNormalized || normalizeEmail(duplicate.email);
    const duplicateWitnessEmail = normalizeEmail(duplicateWitness.email);
    const duplicateAddress = duplicate.addressNormalized || normalizeAddress(duplicate);
    const duplicateName = duplicate.fullNameNormalized || normalizeText(`${duplicate.firstName || ''} ${duplicate.lastName || ''}`);
    const who = buildLeadInfo(duplicate).name || 'another lead';

    if (fullNameNormalized && duplicateName === fullNameNormalized) {
      pushUnique(fieldErrors, {
        field: 'firstName',
        message: `This name matches an existing lead (${who}). Capitalization does not make it a new lead.`,
      });
      pushUnique(fieldErrors, {
        field: 'lastName',
        message: `This name matches an existing lead (${who}). Capitalization does not make it a new lead.`,
      });
    }

    if (phoneNormalized && (duplicatePhone === phoneNormalized || duplicateWitnessPhone === phoneNormalized)) {
      pushUnique(fieldErrors, {
        field: 'phone',
        message: duplicateWitnessPhone === phoneNormalized && duplicatePhone !== phoneNormalized
          ? `This phone number is already saved as a witness number on ${who}.`
          : `This phone number already exists on ${who}.`,
      });
    }

    if (emailNormalized && (duplicateEmail === emailNormalized || duplicateWitnessEmail === emailNormalized)) {
      pushUnique(fieldErrors, {
        field: 'email',
        message: duplicateWitnessEmail === emailNormalized && duplicateEmail !== emailNormalized
          ? `This email is already saved as a witness email on ${who}.`
          : `This email already exists on ${who}.`,
      });
    }

    if (addressNormalized && duplicateAddress === addressNormalized) {
      const message = `This address already exists on ${who}. Street, city, state, and ZIP are compared together.`;
      ['streetAddress', 'city', 'state', 'zipCode'].forEach(field => {
        pushUnique(fieldErrors, { field, message });
      });
    }

    if (
      witnessPhoneNormalized &&
      (duplicatePhone === witnessPhoneNormalized || duplicateWitnessPhone === witnessPhoneNormalized)
    ) {
      pushUnique(fieldErrors, {
        field: 'fields.Witness Number',
        message: `Witness number already matches customer or witness data on ${who}.`,
      });
    }

    if (
      witnessEmailNormalized &&
      (duplicateEmail === witnessEmailNormalized || duplicateWitnessEmail === witnessEmailNormalized)
    ) {
      pushUnique(fieldErrors, {
        field: 'fields.Witness Email',
        message: `Witness email already matches customer or witness data on ${who}.`,
      });
    }
  });

  if (fieldErrors.length === 0) {
    return { isDuplicate: false, duplicateReason: '', fieldErrors, existingLeadInfo: null };
  }

  const duplicateReason = Array.from(new Set(fieldErrors.map(error => error.message))).join(' ');

  return {
    isDuplicate: true,
    duplicateReason,
    fieldErrors,
    existingLeadInfo: buildLeadInfo(matches[0]),
  };
};
