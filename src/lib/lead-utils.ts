import { DYNAMIC_FIELDS } from '@/lib/dynamic-fields';

export const LEAD_STATUSES = [
  'PENDING',
  'REJECTED',
  'VERIFIED',
  'REJECTED_BY_CLIENT',
  'POSTED',
  'PAID',
  'SIGNED',
  'VM',
  'TRANSFERRED',
  'SEND_TO_ANOTHER_BUYER',
  'DUPLICATE',
  'NOT_RESPONDING',
  'FELONY',
  'DEAD_LEAD',
  'WORKING',
  'CALL_BACK',
  'ATTEMPT_1',
  'ATTEMPT_2',
  'ATTEMPT_3',
  'ATTEMPT_4',
  'CHARGEBACK',
  'WAITING_ID',
  'SENT_TO_CLIENT',
  'QC',
  'ID_VERIFIED',
  'BILLABLE',
  'CAMPAIGN_PAUSED',
  'SENT_TO_LAW_FIRM',
  'RETURNED',
  'ON_HOLD',
  'REPLACE',
  'REFRESH',
  'REDO-TCPA',
  'REDOTCPA',
  'FRAUD',
  'ONCALL',
  'INVERIFICATION',
] as const;

export const LEGACY_STATUS_VALUES: Record<string, string[]> = {
  POSTED: ['POSTED', 'Posted'],
  TRANSFERRED: ['TRANSFERRED', 'Transferred'],
  SEND_TO_ANOTHER_BUYER: ['SEND_TO_ANOTHER_BUYER', 'SEND TO ANOTHER BUYER'],
  REFRESH: ['REFRESH', 'Refresh'],
  'REDO-TCPA': ['REDO-TCPA', 'REDOTCPA', 'RedoTCPA'],
  REDOTCPA: ['REDOTCPA', 'RedoTCPA'],
  FRAUD: ['FRAUD', 'Fraud'],
  ONCALL: ['ONCALL', 'OnCall'],
  INVERIFICATION: ['INVERIFICATION', 'InVerification'],
};

export const getStatusQueryValue = (status: string) => {
  const values = LEGACY_STATUS_VALUES[status];
  return values ? { $in: values } : status;
};

export const normalizeLeadStatus = (status?: string | null) => {
  if (status === 'Posted') return 'POSTED';
  if (status === 'Transferred') return 'TRANSFERRED';
  if (status === 'SEND TO ANOTHER BUYER') return 'SEND_TO_ANOTHER_BUYER';
  if (status === 'Refresh') return 'REFRESH';
  if (status === 'RedoTCPA') return 'REDOTCPA';
  if (status === 'Fraud') return 'FRAUD';
  if (status === 'OnCall') return 'ONCALL';
  if (status === 'InVerification') return 'INVERIFICATION';
  return status || '';
};

export const WITNESS_NAME_KEY = 'Witness Name';
export const WITNESS_PHONE_KEY = 'Witness Number';
export const WITNESS_EMAIL_KEY = 'Witness Email';
export const LEGACY_WITNESS_NAME_KEY = 'Incident Reported Person Name';
export const LEGACY_WITNESS_PHONE_KEY = 'Incident Reported Person Number';
export const LEGACY_WITNESS_EMAIL_KEY = 'Incident Reported Person Email';
export const WITNESS_PHONE_KEYS = [WITNESS_PHONE_KEY, LEGACY_WITNESS_PHONE_KEY];
export const WITNESS_EMAIL_KEYS = [WITNESS_EMAIL_KEY, LEGACY_WITNESS_EMAIL_KEY];

export const normalizeEmail = (value?: string | null) => (value || '').trim().toLowerCase();

export const normalizePhone = (value?: string | null) => (value || '').replace(/\D/g, '');

export const isTenDigitPhone = (value?: string | null) => /^\d{10}$/.test(value || '');

const isSequentialChunk = (chunk: string) => {
  let ascending = true;
  let descending = true;

  for (let index = 1; index < chunk.length; index += 1) {
    const diff = Number(chunk[index]) - Number(chunk[index - 1]);
    if (diff !== 1) ascending = false;
    if (diff !== -1) descending = false;
  }

  return ascending || descending;
};

export const isJunkPhoneNumber = (digits: string) => {
  if (!/^\d{10}$/.test(digits)) return false;
  if (/^(\d)\1{9}$/.test(digits)) return true;
  if (/(\d)\1{6,}/.test(digits)) return true;

  for (const size of [2, 5]) {
    const block = digits.slice(0, size);
    if (block.repeat(10 / size) === digits) return true;
  }

  const block = digits.slice(0, 3);
  if (block === digits.slice(3, 6) && block === digits.slice(6, 9)) return true;

  for (let index = 0; index <= digits.length - 7; index += 1) {
    if (isSequentialChunk(digits.slice(index, index + 7))) return true;
  }

  return false;
};

export const validateUSPhoneNumber = (value?: string | null, label = 'Phone number') => {
  const raw = (value || '').trim();
  const digits = normalizePhone(raw);

  if (!raw) return `${label} is required.`;
  if (digits.length === 11 && digits.startsWith('1')) {
    return `${label} must be 10 digits. Do not include the +1 country code.`;
  }
  if (raw !== digits || !/^\d+$/.test(raw)) {
    return `${label} must be 10 digits only, like 2025550148. Do not use dashes, spaces, letters, or +1.`;
  }
  if (!isTenDigitPhone(digits)) return `${label} must contain exactly 10 digits.`;
  if (/^[01]/.test(digits.slice(0, 3))) return `${label} area code cannot start with 0 or 1.`;
  if (/^[01]/.test(digits.slice(3, 6))) return `${label} exchange code cannot start with 0 or 1.`;
  if (isJunkPhoneNumber(digits)) {
    return `${label} looks fake. Repeated or sequential numbers are not accepted.`;
  }

  return null;
};

export const digitsOnlyPhone = (value?: string | null) => {
  const digits = normalizePhone(value);
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
};

export const normalizeText = (value?: string | null) =>
  (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

export const composeAddress = (values: {
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  address?: string | null;
}) => {
  const parts = [values.streetAddress, values.city, values.state, values.zipCode]
    .map(part => (part || '').trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : (values.address || '').trim();
};

export const normalizeAddress = (values: {
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  address?: string | null;
}) =>
  composeAddress(values)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

export const getFieldValue = (fields: unknown, key: string) => {
  if (!fields || typeof fields !== 'object') return '';

  if (Array.isArray(fields)) {
    const match = fields.find((field: any) => field?.key === key);
    return typeof match?.value === 'string' ? match.value : '';
  }

  const value = (fields as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
};

export const getWitnessDetails = (fields: unknown) => ({
  name:
    getFieldValue(fields, WITNESS_NAME_KEY) ||
    getFieldValue(fields, LEGACY_WITNESS_NAME_KEY),
  phone:
    getFieldValue(fields, WITNESS_PHONE_KEY) ||
    getFieldValue(fields, LEGACY_WITNESS_PHONE_KEY),
  email:
    getFieldValue(fields, WITNESS_EMAIL_KEY) ||
    getFieldValue(fields, LEGACY_WITNESS_EMAIL_KEY),
});

export const withCanonicalWitnessFields = (fields: Record<string, string>) => {
  const next = { ...fields };
  const witness = getWitnessDetails(next);

  if (witness.name && !next[WITNESS_NAME_KEY]) next[WITNESS_NAME_KEY] = witness.name;
  if (witness.phone && !next[WITNESS_PHONE_KEY]) next[WITNESS_PHONE_KEY] = digitsOnlyPhone(witness.phone);
  if (witness.email && !next[WITNESS_EMAIL_KEY]) next[WITNESS_EMAIL_KEY] = witness.email.trim();
  if (next[WITNESS_PHONE_KEY]) next[WITNESS_PHONE_KEY] = digitsOnlyPhone(next[WITNESS_PHONE_KEY]);

  return next;
};

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const exactTextQuery = (value: string) => ({
  $regex: `^${escapeRegex(value.trim())}$`,
  $options: 'i',
});

export const flexiblePhoneQuery = (digits: string) => ({
  $regex: `^\\D*${digits.split('').map(digit => escapeRegex(digit)).join('\\D*')}\\D*$`,
});

export const applicationTypeQuery = (value: string) => exactTextQuery(value);

export const parseEntryDate = (value: string) => {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  const match = iso
    ? { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) }
    : us
      ? { year: Number(us[3]), month: Number(us[1]), day: Number(us[2]) }
      : null;

  if (!match) return null;

  const date = new Date(match.year, match.month - 1, match.day);
  if (
    date.getFullYear() !== match.year ||
    date.getMonth() !== match.month - 1 ||
    date.getDate() !== match.day
  ) {
    return null;
  }

  return match;
};

export const createdAtDayQuery = (value: string) => {
  const parsed = parseEntryDate(value);
  if (!parsed) return null;

  const start = new Date(parsed.year, parsed.month - 1, parsed.day, 0, 0, 0, 0);
  const end = new Date(parsed.year, parsed.month - 1, parsed.day + 1, 0, 0, 0, 0);
  return { $gte: start, $lt: end };
};

export type FieldValidationError = {
  field: string;
  message: string;
};

export const validateLeadPayload = (body: any) => {
  const errors: FieldValidationError[] = [];
  const applicationType = body?.applicationType;
  const fields = body?.fields || {};

  if (!applicationType) errors.push({ field: 'applicationType', message: 'Application type is required.' });
  if (!normalizeText(body?.firstName)) errors.push({ field: 'firstName', message: 'First name is required.' });
  if (!normalizeText(body?.lastName)) errors.push({ field: 'lastName', message: 'Last name is required.' });
  if (!normalizeEmail(body?.email)) {
    errors.push({ field: 'email', message: 'Email address is required.' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(body.email))) {
    errors.push({ field: 'email', message: 'Email address format is incorrect.' });
  }
  if (!normalizeText(body?.streetAddress)) errors.push({ field: 'streetAddress', message: 'Street address is required.' });
  if (!normalizeText(body?.city)) errors.push({ field: 'city', message: 'City is required.' });
  if (!normalizeText(body?.state)) errors.push({ field: 'state', message: 'State is required.' });
  if (!normalizeText(body?.zipCode)) {
    errors.push({ field: 'zipCode', message: 'ZIP code is required.' });
  } else if (!/^\d{5}(-\d{4})?$/.test(String(body.zipCode).trim())) {
    errors.push({ field: 'zipCode', message: 'ZIP code must look like 12345 or 12345-6789.' });
  }

  const phoneError = validateUSPhoneNumber(body?.phone, 'Phone number');
  if (phoneError) errors.push({ field: 'phone', message: phoneError });

  const dynamicFieldsConfig = DYNAMIC_FIELDS[applicationType] || [];
  const isJuvenileAbuse = applicationType === 'Juvenile Detention Center (JDC)';
  const requiredFields = isJuvenileAbuse
    ? dynamicFieldsConfig.filter(field => field.key === 'Location Of Incident')
    : dynamicFieldsConfig.filter(field => field.required);

  requiredFields.forEach(field => {
    if (field.key === WITNESS_NAME_KEY || field.key === WITNESS_PHONE_KEY) return;
    if (!getFieldValue(fields, field.key).trim()) {
      errors.push({ field: `fields.${field.key}`, message: `${field.label} is required.` });
    }
  });

  dynamicFieldsConfig
    .filter(field => field.type === 'phone' && field.key !== WITNESS_PHONE_KEY)
    .forEach(field => {
      const value = getFieldValue(fields, field.key).trim();
      const fieldError = value ? validateUSPhoneNumber(value, field.label) : null;
      if (fieldError) errors.push({ field: `fields.${field.key}`, message: fieldError });
    });

  if (applicationType === 'Rideshare' || applicationType === 'Roblox') {
    const witness = getWitnessDetails(fields);
    if (!witness.name.trim()) errors.push({ field: `fields.${WITNESS_NAME_KEY}`, message: 'Witness name is required for Rideshare and Roblox.' });
    if (!witness.phone.trim()) {
      errors.push({ field: `fields.${WITNESS_PHONE_KEY}`, message: 'Witness number is required for Rideshare and Roblox.' });
    } else {
      const witnessError = validateUSPhoneNumber(witness.phone, 'Witness number');
      if (witnessError) errors.push({ field: `fields.${WITNESS_PHONE_KEY}`, message: witnessError });
      else if (normalizePhone(witness.phone) === normalizePhone(body?.phone)) {
        errors.push({
          field: `fields.${WITNESS_PHONE_KEY}`,
          message: 'Witness number cannot be the same as the customer phone number.',
        });
      }
    }

    if (witness.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(witness.email.trim())) {
        errors.push({ field: `fields.${WITNESS_EMAIL_KEY}`, message: 'Witness email is invalid.' });
      } else if (normalizeEmail(witness.email) === normalizeEmail(body?.email)) {
        errors.push({
          field: `fields.${WITNESS_EMAIL_KEY}`,
          message: 'Witness email cannot be the same as the customer email.',
        });
      }
    }
  }

  return errors;
};

export const buildFieldsArray = (fields: unknown) => {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return [];

  return Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({ key, value: String(value) }));
};
