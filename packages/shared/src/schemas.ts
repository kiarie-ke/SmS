/** Zod schemas shared by the web forms (the API validates with class-validator). */
import { z } from 'zod';
import { KENYAN_PHONE_REGEX, ROLES } from './constants';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

export const kenyanPhoneSchema = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .refine((value) => KENYAN_PHONE_REGEX.test(value), {
    message: 'Use a valid Kenyan number in the format +2547XXXXXXXX',
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const registerUserSchema = z.object({
  email: emailSchema,
  phone: kenyanPhoneSchema,
  password: passwordSchema,
  role: z.enum(ROLES),
});
export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export const userSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  phone: z.string(),
  role: z.enum(ROLES),
  isActive: z.boolean(),
  lastLoginAt: z.string().nullable(),
});
export type UserSummary = z.infer<typeof userSummarySchema>;
