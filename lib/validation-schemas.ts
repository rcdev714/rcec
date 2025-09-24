import { z } from 'zod';

// Authentication schemas
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email is too long')
    .transform((email) => email.toLowerCase().trim()),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
});

export const signUpSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email is too long')
    .transform((email) => email.toLowerCase().trim()),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email is too long')
    .transform((email) => email.toLowerCase().trim())
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  token: z.string().min(1, 'Reset token is required')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// User profile schemas
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .max(100, 'Full name is too long')
    .optional(),
  company: z
    .string()
    .max(100, 'Company name is too long')
    .optional(),
  phone: z
    .string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal(''))
});

// Chat and AI schemas
export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message is too long')
    .trim(),
  conversationId: z
    .string()
    .uuid('Invalid conversation ID')
    .optional(),
  useLangGraph: z
    .boolean()
    .default(true)
    .optional()
});

// Company search schemas
export const companySearchSchema = z.object({
  query: z
    .string()
    .max(500, 'Search query is too long')
    .optional(),
  industry: z
    .string()
    .max(100, 'Industry name is too long')
    .optional(),
  location: z
    .string()
    .max(100, 'Location is too long')
    .optional(),
  size: z
    .enum(['small', 'medium', 'large', 'enterprise'])
    .optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
});

// Subscription and payment schemas
export const createSubscriptionSchema = z.object({
  planId: z
    .enum(['FREE', 'PRO', 'ENTERPRISE'], {
      errorMap: () => ({ message: 'Invalid plan selected' })
    }),
  paymentMethodId: z
    .string()
    .min(1, 'Payment method is required')
    .optional() // Optional for free plans
});

export const updateSubscriptionSchema = z.object({
  planId: z
    .enum(['FREE', 'PRO', 'ENTERPRISE'], {
      errorMap: () => ({ message: 'Invalid plan selected' })
    })
});

// Offerings schemas
export const createOfferingSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title is too long')
    .trim(),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description is too long')
    .trim(),
  targetCompanies: z
    .array(
      z.object({
        companyId: z.string().uuid('Invalid company ID'),
        companyName: z.string().max(200, 'Company name is too long')
      })
    )
    .min(1, 'At least one target company is required')
    .max(50, 'Too many target companies')
});

// API request validation helpers
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError['errors'] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors
  };
}

// Sanitization helpers
export const sanitizeString = (str: string): string => {
  return str
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .substring(0, 10000); // Limit length
};

export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim().substring(0, 254);
};

// Type exports for use in components
export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type CompanySearchInput = z.infer<typeof companySearchSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type CreateOfferingInput = z.infer<typeof createOfferingSchema>;