'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FieldErrors, useForm } from 'react-hook-form';
import DashboardLayout from '@/components/DashboardLayout';
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
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  ArrowLeft,
  User,
  ClipboardList,
  Save,
  Check,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { DateInput } from '@/components/ui/DateInput';
import { DYNAMIC_FIELDS } from '@/lib/dynamic-fields';
import { normalizePhone, validateUSPhoneNumber } from '@/lib/lead-utils';

const APPLICATION_TYPES = Object.keys(DYNAMIC_FIELDS);

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().superRefine((value, ctx) => {
    const error = validateUSPhoneNumber(value);
    if (error) ctx.addIssue({ code: 'custom', message: error });
  }),
  dateOfBirth: z.string().optional(),
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

export default function PublicLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedAsDuplicate, setSavedAsDuplicate] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});
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

  const onSubmit = async (values: FormValues) => {
    const requiredDynamicFields =
      selectedType === 'Juvenile Detention Center (JDC)'
        ? (DYNAMIC_FIELDS[selectedType] || []).filter(f => f.key === 'Location Of Incident')
        : (DYNAMIC_FIELDS[selectedType] || []).filter(f => f.required);

    const missingFields = requiredDynamicFields.filter(
      f => !dynamicFields[f.key]
    );
    const invalidPhoneFields = (DYNAMIC_FIELDS[selectedType] || [])
      .filter(f => f.type === 'phone')
      .map(f => ({
        label: f.label,
        error: dynamicFields[f.key] ? validateUSPhoneNumber(dynamicFields[f.key], f.label) : null,
      }))
      .filter(f => f.error);

    const clientProblems = [
      ...missingFields.map(field => `${field.label} is required.`),
      ...invalidPhoneFields.map(field => field.error || 'Phone number is invalid.'),
    ];

    if (clientProblems.length > 0) {
      setProblems(clientProblems);
      toast({
        title: 'Lead was not saved',
        description: clientProblems.join(' '),
        variant: 'destructive',
      });
      return;
    }

    setProblems([]);
    setDynamicErrors({});
    setLoading(true);
    try {
      const { data } = await axios.post('/api/leads', {
        ...values,
        fields: dynamicFields,
        status: 'PENDING',
      });

      setSavedAsDuplicate(Boolean(data.isDuplicate));
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
        : [error.response?.data?.message || 'The lead could not be saved.'];
      setProblems(serverProblems as string[]);
      toast({
        title: 'Lead was not saved',
        description: serverProblems.join(' '),
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const onInvalidSubmit = (errors: FieldErrors<FormValues>) => {
    const firstMessage = Object.values(errors).find(error => error?.message)?.message;
    const missingFields = Object.entries(errors)
      .filter(([, error]) => typeof error?.message === 'string' && error.message.toLowerCase().includes('required'))
      .map(([field]) => FORM_FIELD_LABELS[field as keyof FormValues] || field);

    toast({
      title: 'Action Required',
      description: missingFields.length > 0
        ? `Please fill out: ${missingFields.join(', ')}.`
        : String(firstMessage || 'Please correct the highlighted fields.'),
      variant: 'warning',
    });
  };

  const renderDynamicFields = () =>
    (DYNAMIC_FIELDS[selectedType] || []).map(field => {
      const isRequired = selectedType === 'Juvenile Detention Center (JDC)'
        ? field.key === 'Location Of Incident'
        : field.required;
      let input;
      if (field.type === 'date') {
        input = (
          <DateInput
            value={dynamicFields[field.key] || ''}
            onChange={value => setDynamicFields(prev => ({ ...prev, [field.key]: value }))}
          />
        );
      } else if (field.type === 'textarea') {
        input = (
          <Textarea
            value={dynamicFields[field.key] || ''}
            onChange={e => setDynamicFields(prev => ({ ...prev, [field.key]: e.target.value }))}
          />
        );
      } else if (field.type === 'radio' || field.type === 'checkbox') {
        const options = field.options || [{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }];
        input = (
          <Select
            value={dynamicFields[field.key] || ''}
            onValueChange={value => setDynamicFields(prev => ({ ...prev, [field.key]: value }))}
          >
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      } else {
        input = (
          <Input
            inputMode={field.type === 'phone' ? 'numeric' : undefined}
            maxLength={field.type === 'phone' ? 10 : undefined}
            placeholder={field.type === 'phone' ? '10 digits, no dashes' : undefined}
            value={dynamicFields[field.key] || ''}
            onChange={e => setDynamicFields(prev => ({
              ...prev,
              [field.key]: field.type === 'phone' ? normalizePhone(e.target.value).slice(0, 10) : e.target.value,
            }))}
          />
        );
      }

      return (
        <FormItem key={field.key}>
          <FormLabel className="text-sm">{field.label}{isRequired && '*'}</FormLabel>
          <FormControl>{input}</FormControl>
          {dynamicErrors[field.key] && (
            <p className="text-sm font-medium text-destructive">{dynamicErrors[field.key]}</p>
          )}
        </FormItem>
      );
    });

  if (submitted) {
    return (
      <DashboardLayout hideSidebar>
        <div className="flex min-h-[65vh] items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface w-full max-w-md p-8 text-center"
          >
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success/12 text-success ring-8 ring-success/5">
              <Check className="size-7" strokeWidth={2.5} />
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-tight">{savedAsDuplicate ? 'Saved as duplicate' : 'Lead created'}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {savedAsDuplicate
                ? 'This lead matches an existing record, so it was added with Duplicate status.'
                : 'It passed duplicate and phone checks.'}
            </p>
            <Button className="mt-6" onClick={() => router.push('/leads')}>
              View all leads
            </Button>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout hideSidebar>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="eyebrow">Intake</p>
            <h1 className="text-2xl font-bold tracking-tight">New lead</h1>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-6">
            {problems.length > 0 && (
              <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3.5 text-sm">
                <p className="font-semibold text-destructive">Fix these before submitting</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-foreground/85">
                  {problems.map(problem => <li key={problem}>{problem}</li>)}
                </ul>
              </div>
            )}

            {/* Client Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <CardTitle>Client Details</CardTitle>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'streetAddress', 'city', 'state', 'zipCode'].map(name => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name as keyof FormValues}
                    render={({ field }) => (
                      <FormItem className={name === 'streetAddress' ? 'md:col-span-2' : ''}>
                        <FormLabel>
                          {({ firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone', dateOfBirth: 'Date of birth', streetAddress: 'Street address', city: 'City', state: 'State', zipCode: 'ZIP code' } as Record<string, string>)[name]}
                          {name !== 'dateOfBirth' && <span className="text-destructive">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type={name === 'dateOfBirth' ? 'date' : 'text'}
                            inputMode={name === 'phone' || name === 'zipCode' ? 'numeric' : undefined}
                            maxLength={name === 'phone' ? 10 : undefined}
                            {...field}
                            onChange={(event) => {
                              field.onChange(name === 'phone' ? normalizePhone(event.target.value).slice(0, 10) : event.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Case Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  <CardTitle>Case Information</CardTitle>
                </div>
              </CardHeader>
              <Separator />
              <CardContent>
                <FormField
                  control={form.control}
                  name="applicationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Type*</FormLabel>
                      <Select
                        onValueChange={val => {
                          field.onChange(val);
                          setSelectedType(val);
                          setDynamicFields({});
                          setDynamicErrors({});
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select application type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {APPLICATION_TYPES.map(type => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Notepad</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add any additional notes about this lead" {...field} />
                    </FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Case Specific */}
            {selectedType && (
              <Card>
                <CardHeader>
                  <CardTitle>Case-Specific Information</CardTitle>
                  <CardDescription>
                    Details for: {selectedType}
                  </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderDynamicFields()}
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
              <p className="hidden text-xs text-muted-foreground sm:block">
                <span className="text-destructive">*</span> Required. Phone numbers must be 10 digits, with no dashes or +1.
              </p>
              <Button type="submit" disabled={loading} className="ml-auto min-w-[140px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Create lead
              </Button>
            </div>

          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
