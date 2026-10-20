'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FieldErrors, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Loader2,
  ArrowLeft,
  User,
  ClipboardList,
  Save,
  Check,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { DateInput } from '@/components/ui/DateInput';
import { DYNAMIC_FIELDS } from '@/lib/dynamic-fields';
import { digitsOnlyPhone, normalizePhone, validateUSPhoneNumber, withCanonicalWitnessFields } from '@/lib/lead-utils';

const APPLICATION_TYPES = Object.keys(DYNAMIC_FIELDS);

const FIELD_META: Record<string, { label: string; placeholder: string; span?: string }> = {
  firstName: { label: 'First name', placeholder: 'Jane' },
  lastName: { label: 'Last name', placeholder: 'Doe' },
  email: { label: 'Email', placeholder: 'jane@example.com' },
  phone: { label: 'Phone', placeholder: '10 digits, e.g. 2125550147' },
  dateOfBirth: { label: 'Date of birth', placeholder: 'MM/DD/YYYY' },
  streetAddress: { label: 'Street address', placeholder: '123 Main St, Apt 4', span: 'md:col-span-2' },
  city: { label: 'City', placeholder: 'Austin' },
  state: { label: 'State', placeholder: 'TX' },
  zipCode: { label: 'ZIP code', placeholder: '78701' },
};

function SectionCard({ step, icon: Icon, title, description, children }: {
  step: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface overflow-hidden">
      <header className="flex items-center gap-3.5 border-b bg-muted/25 px-5 py-4 md:px-6">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Step {step}</p>
          <h2 className="text-[15px] font-semibold leading-tight tracking-tight text-foreground">{title}</h2>
        </div>
        <p className="ml-auto hidden max-w-xs text-right text-xs text-muted-foreground md:block">{description}</p>
      </header>
      <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 md:p-6">{children}</div>
    </section>
  );
}

// Schema updated to accept strings for dates in 'YYYY-MM-DD' format
const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().superRefine((value, ctx) => {
    const error = validateUSPhoneNumber(value);
    if (error) ctx.addIssue({ code: 'custom', message: error });
  }),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  streetAddress: z.string().min(1, 'Street Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'ZIP code is required').regex(/^\d{5}(-\d{4})?$/, 'ZIP code format is incorrect.'),
  applicationType: z.string().min(1, 'Application type is required'),
  lawsuit: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const FORM_FIELD_LABELS: Record<keyof FormValues, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone number',
  dateOfBirth: 'Date of birth',
  streetAddress: 'Street Address',
  city: 'City',
  state: 'State',
  zipCode: 'ZIP code',
  applicationType: 'Application type',
  lawsuit: 'Lawsuit',
  notes: 'Notes',
};

interface CreateLeadClientProps {
  mode?: 'create' | 'edit';
  leadId?: string;
}

const normalizeDateValue = (value?: string) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CreateLeadClient({ mode = 'create', leadId }: CreateLeadClientProps) {
  const router = useRouter();
  const isEditMode = mode === 'edit' && !!leadId;
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [selectedType, setSelectedType] = useState<string>('');
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});
  const [dynamicErrors, setDynamicErrors] = useState<Record<string, string>>({});
  const [problems, setProblems] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      applicationType: '',
      lawsuit: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!isEditMode || !leadId) return;

    const fetchLead = async () => {
      setInitialLoading(true);
      try {
        const { data } = await axios.get(`/api/admin/leads/${leadId}`);
        const existingLead = data.lead;

        const mappedDynamicFields = withCanonicalWitnessFields(
          Array.isArray(existingLead.fields)
            ? existingLead.fields.reduce((acc: Record<string, string>, field: { key: string; value: string }) => {
                if (field?.key) acc[field.key] = field.value || '';
                return acc;
              }, {})
            : (existingLead.fields || {})
        );

        form.reset({
          firstName: existingLead.firstName || '',
          lastName: existingLead.lastName || '',
          email: existingLead.email || '',
          phone: digitsOnlyPhone(existingLead.phone),
          dateOfBirth: normalizeDateValue(existingLead.dateOfBirth),
          streetAddress: existingLead.streetAddress || existingLead.address || '',
          city: existingLead.city || '',
          state: existingLead.state || '',
          zipCode: existingLead.zipCode || '',
          applicationType: existingLead.applicationType || '',
          lawsuit: existingLead.lawsuit || '',
          notes: existingLead.notes || '',
        });

        setSelectedType(existingLead.applicationType || '');
        setDynamicFields(mappedDynamicFields);
        setDynamicErrors({});
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to load lead',
          variant: 'destructive',
        });
        router.push('/admin/leads');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchLead();
  }, [form, isEditMode, leadId, router]);

  const onSubmit = async (values: FormValues) => {
    const requiredDynamicFields =
      selectedType === 'Juvenile Detention Center (JDC)'
        ? (DYNAMIC_FIELDS[selectedType] || []).filter(field => field.key === 'Location Of Incident')
        : (DYNAMIC_FIELDS[selectedType] || []).filter(field => field.required);

    const missingFields = requiredDynamicFields.filter(field => !dynamicFields[field.key]);
    const invalidPhoneFields = (DYNAMIC_FIELDS[selectedType] || [])
      .filter(field => field.type === 'phone')
      .map(field => ({
        label: field.label,
        error: dynamicFields[field.key] ? validateUSPhoneNumber(dynamicFields[field.key], field.label) : null,
      }))
      .filter(field => field.error);

    const clientProblems = [
      ...missingFields.map(field => `${field.label} is required.`),
      ...invalidPhoneFields.map(field => field.error || 'Phone number is invalid.'),
    ];

    if (clientProblems.length > 0) {
      setProblems(clientProblems);
      missingFields.forEach(field => {
        setDynamicErrors(prev => ({ ...prev, [field.key]: `${field.label} is required.` }));
      });
      toast({
        title: 'Lead was not saved',
        description: clientProblems.join(' '),
        variant: 'destructive'
      });
      return;
    }

    setProblems([]);
    setDynamicErrors({});
    setLoading(true);
    try {
      const payload = {
        ...values,
        fields: dynamicFields,
      };

      if (isEditMode && leadId) {
        await axios.put(`/api/leads/${leadId}`, payload);
        toast({ title: 'Success', description: 'Lead updated successfully' });
        router.push(`/admin/leads/${leadId}`);
        return;
      }

      const { data } = await axios.post('/api/leads', { ...payload, status: 'PENDING' });
      setSubmitted(true);
      toast({
        title: data.isDuplicate ? 'Duplicate Lead' : 'Success',
        description: data.message || 'Lead created successfully',
      });
      setTimeout(() => router.push('/leads'), 1500);
    } catch (error: any) {
      const fieldErrors = error.response?.data?.fieldErrors || error.response?.data?.errors || [];
      const nextDynamicErrors: Record<string, string> = {};

      fieldErrors.forEach((fieldError: { field?: string; message?: string }) => {
        if (!fieldError?.field || !fieldError?.message) return;
        if (fieldError.field.startsWith('fields.')) {
          nextDynamicErrors[fieldError.field.replace('fields.', '')] = fieldError.message;
          return;
        }

        if (fieldError.field in form.getValues()) {
          form.setError(fieldError.field as keyof FormValues, { type: 'server', message: fieldError.message });
        }
      });

      setDynamicErrors(nextDynamicErrors);
      const serverProblems = fieldErrors.length > 0
        ? Array.from(new Set(fieldErrors.map((fieldError: { message?: string }) => fieldError.message).filter(Boolean)))
        : [error.response?.data?.message || (isEditMode ? 'The lead could not be updated.' : 'The lead could not be saved.')];
      setProblems(serverProblems as string[]);
      toast({
        title: 'Lead was not saved',
        description: serverProblems.join(' '),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const onInvalidSubmit = (errors: FieldErrors<FormValues>) => {
    const firstMessage = Object.values(errors).find(error => error?.message)?.message;
    const missingFields = Object.entries(errors)
      .filter(([, error]) => typeof error?.message === 'string' && error.message.toLowerCase().includes('required'))
      .map(([field]) => FORM_FIELD_LABELS[field as keyof FormValues] || field);

    const messages = Object.values(errors)
      .map(error => error?.message)
      .filter((message): message is string => typeof message === 'string');
    setProblems(messages.length > 0 ? messages : ['Please correct the highlighted fields.']);
    toast({
      title: 'Lead was not saved',
      description: missingFields.length > 0
        ? `Please fill out: ${missingFields.join(', ')}.`
        : String(firstMessage || 'Please correct the highlighted fields.'),
      variant: 'warning',
    });
  };

  const renderDynamicFields = () => {
    const fields = DYNAMIC_FIELDS[selectedType] || [];
    return fields.map(field => {
      const isRequired =
        selectedType === 'Juvenile Detention Center (JDC)'
          ? field.key === 'Location Of Incident'
          : field.required;

      let inputComponent;
      if (field.type === 'date') {
        inputComponent = (
          <DateInput
            value={dynamicFields[field.key] || ''}
            onChange={value => setDynamicFields(prev => ({ ...prev, [field.key]: value }))}
          />
        );
      } else if (field.type === 'text' || field.type === 'email' || field.type === 'phone') {
        const placeholder = selectedType === 'Juvenile Detention Center (JDC)' && field.key === 'Location Of Incident'
          ? 'Enter Juvenile Detention Center (JDC) name'
          : `Enter ${field.label.toLowerCase()}`;
        inputComponent = (
          <Input
            type={field.type === 'phone' ? 'text' : field.type}
            inputMode={field.type === 'phone' ? 'numeric' : undefined}
            maxLength={field.type === 'phone' ? 10 : undefined}
            value={dynamicFields[field.key] || ''}
            onChange={e => {
              setDynamicErrors(prev => ({ ...prev, [field.key]: '' }));
              setDynamicFields(prev => ({
                ...prev,
                [field.key]: field.type === 'phone' ? normalizePhone(e.target.value).slice(0, 10) : e.target.value
              }));
            }}
            placeholder={placeholder}
            className={`${dynamicErrors[field.key] ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          />
        );
      } else if (field.type === 'textarea') {
        inputComponent = (
          <Textarea
            value={dynamicFields[field.key] || ''}
            onChange={e => {
              setDynamicErrors(prev => ({ ...prev, [field.key]: '' }));
              setDynamicFields(prev => ({ ...prev, [field.key]: e.target.value }));
            }}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            className={`${dynamicErrors[field.key] ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          />
        );
      } else {
        const options = field.options || [{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }];
        inputComponent = (
          <Select
            value={dynamicFields[field.key] || ''}
            onValueChange={val => {
              setDynamicErrors(prev => ({ ...prev, [field.key]: '' }));
              setDynamicFields(prev => ({ ...prev, [field.key]: val }));
            }}
          >
            <FormControl>
              <SelectTrigger className={`${dynamicErrors[field.key] ? 'border-destructive focus:ring-destructive' : ''}`}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      return (
        <FormItem key={field.key}>
          <FormLabel className="text-sm">{field.label}{isRequired && '*'}</FormLabel>
          <FormControl>{inputComponent}</FormControl>
          {dynamicErrors[field.key] && (
            <p className="text-sm font-medium text-destructive">{dynamicErrors[field.key]}</p>
          )}
          <FormMessage />
        </FormItem>
      );
    });
  };

  if (submitted && !isEditMode) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface w-full max-w-md p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-success/12 text-success ring-8 ring-success/5"
          >
            <Check className="size-7" strokeWidth={2.5} />
          </motion.div>
          <h2 className="text-xl font-bold tracking-tight">Lead created</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">It passed duplicate and phone checks and is now in your pipeline.</p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => router.push('/leads')}>View my leads</Button>
            <Button onClick={() => { form.reset(); setSubmitted(false); setSelectedType(''); setDynamicFields({}); setProblems([]); }}>
              Add another
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl pb-2">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="eyebrow">{isEditMode ? 'Edit' : 'Intake'}</p>
          <h1 className="text-2xl font-bold tracking-tight">{isEditMode ? 'Edit lead' : 'New lead'}</h1>
        </div>
      </div>

      {initialLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-6">
            {problems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="flex gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3.5 text-sm"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">Fix these before submitting</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-foreground/85">
                    {problems.map(problem => <li key={problem}>{problem}</li>)}
                  </ul>
                </div>
              </motion.div>
            )}

            <SectionCard step={1} icon={User} title="Client details" description="Name, contact, and address are checked for duplicates.">
              {Object.keys(FIELD_META).map(fieldName => (
                <FormField
                  key={fieldName}
                  control={form.control}
                  name={fieldName as keyof FormValues}
                  render={({ field }) => (
                    <FormItem className={FIELD_META[fieldName].span}>
                      <FormLabel>
                        {FIELD_META[fieldName].label}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        {fieldName === 'dateOfBirth' ? (
                          <DateInput {...field} />
                        ) : (
                          <Input
                            type={fieldName === 'email' ? 'email' : 'text'}
                            inputMode={fieldName === 'phone' || fieldName === 'zipCode' ? 'numeric' : undefined}
                            maxLength={fieldName === 'phone' ? 10 : undefined}
                            placeholder={FIELD_META[fieldName].placeholder}
                            {...field}
                            onChange={(event) => {
                              const value = fieldName === 'phone'
                                ? normalizePhone(event.target.value).slice(0, 10)
                                : event.target.value;
                              field.onChange(value);
                            }}
                            className={fieldName === 'phone' ? 'tabular-nums' : undefined}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </SectionCard>

            <SectionCard step={2} icon={ClipboardList} title="Case information" description="The case type decides which details are required.">
              <FormField control={form.control} name="applicationType" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Case type<span className="text-destructive">*</span></FormLabel>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      setSelectedType(val);
                      setDynamicFields({});
                      setDynamicErrors({});
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a case type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      {APPLICATION_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notepad</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anything the team should know about this lead"
                      {...field}
                      className="min-h-[100px] resize-y"
                    />
                  </FormControl>
                </FormItem>
              )} />
            </SectionCard>

            {selectedType && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <SectionCard step={3} icon={FileText} title={`${selectedType} details`} description="Witness name and number are required for Rideshare and Roblox.">
                  {renderDynamicFields()}
                </SectionCard>
              </motion.div>
            )}

            <div className="sticky bottom-4 z-30 rounded-xl border bg-card/90 shadow-lg shadow-black/5 backdrop-blur-md">
              <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
                <p className="hidden text-xs text-muted-foreground sm:block">
                  <span className="text-destructive">*</span> Required. Phone numbers must be 10 digits, with no dashes or +1.
                </p>
                <div className="ml-auto flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                  <Button type="submit" disabled={loading} className="min-w-[140px]">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isEditMode ? 'Save changes' : 'Create lead'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
