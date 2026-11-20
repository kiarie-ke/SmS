/**
 * Zod schemas shared by the web forms (the API validates with class-validator).
 * Every create/edit dialog resolves its React Hook Form with one of these.
 */
import { z } from 'zod';
import {
  BOARDING_STATUSES,
  CLASS_LEVELS,
  EMPLOYMENT_TYPES,
  GENDERS,
  RELATIONSHIPS,
  SUBJECT_LEVELS,
} from './constants';
import { kenyanPhoneSchema } from './schemas';

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

export const studentFormSchema = z.object({
  admissionNumber: z.string().trim().min(1, 'Admission number is required').max(30),
  upi: z.string().trim().min(1, 'UPI is required').max(30),
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  middleName: optionalText(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  gender: z.enum(GENDERS),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  county: z.string().trim().min(1, 'County is required').max(60),
  subCounty: z.string().trim().min(1, 'Sub-county is required').max(60),
  classId: z.string().uuid('Choose a class'),
  streamId: z.string().uuid('Choose a stream').optional().or(z.literal('')),
  boardingStatus: z.enum(BOARDING_STATUSES).optional(),
  religion: optionalText(60),
});
export type StudentFormInput = z.infer<typeof studentFormSchema>;

export const guardianFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  phone: kenyanPhoneSchema,
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Enter a valid email')]).optional(),
  nationalId: optionalText(20),
  relationship: z.enum(RELATIONSHIPS),
  occupation: optionalText(80),
  address: optionalText(160),
});
export type GuardianFormInput = z.infer<typeof guardianFormSchema>;

export const teacherFormSchema = z.object({
  userId: z.string().uuid('Choose a login account'),
  tscNumber: z.string().trim().min(1, 'TSC number is required').max(30),
  nationalId: z.string().trim().min(1, 'National ID is required').max(20),
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  phone: kenyanPhoneSchema,
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  employmentType: z.enum(EMPLOYMENT_TYPES),
});
export type TeacherFormInput = z.infer<typeof teacherFormSchema>;

export const classFormSchema = z.object({
  level: z.enum(CLASS_LEVELS),
  name: z.string().trim().min(1, 'Class name is required').max(60),
  academicYearId: z.string().uuid('Choose an academic year'),
  classTeacherId: z.string().uuid('Choose a teacher').optional().or(z.literal('')),
});
export type ClassFormInput = z.infer<typeof classFormSchema>;

export const streamFormSchema = z.object({
  classId: z.string().uuid('Choose a class'),
  name: z.string().trim().min(1, 'Stream name is required').max(40),
});
export type StreamFormInput = z.infer<typeof streamFormSchema>;

export const subjectFormSchema = z.object({
  name: z.string().trim().min(1, 'Subject name is required').max(80),
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{2,15}$/, 'Use 2-15 letters, digits or dashes'),
  level: z.enum(SUBJECT_LEVELS),
  isCbc: z.boolean().optional(),
});
export type SubjectFormInput = z.infer<typeof subjectFormSchema>;

const isoDate = z.string().min(1, 'Choose a date');

export const academicYearFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(20),
    startDate: isoDate,
    endDate: isoDate,
    isCurrent: z.boolean().optional(),
  })
  .refine((values) => values.endDate >= values.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });
export type AcademicYearFormInput = z.infer<typeof academicYearFormSchema>;

export const termFormSchema = z
  .object({
    academicYearId: z.string().uuid('Choose an academic year'),
    termNumber: z.coerce.number().int().min(1).max(3),
    name: z.string().trim().min(1, 'Term name is required').max(30),
    startDate: isoDate,
    endDate: isoDate,
    isCurrent: z.boolean().optional(),
  })
  .refine((values) => values.endDate >= values.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });
export type TermFormInput = z.infer<typeof termFormSchema>;
