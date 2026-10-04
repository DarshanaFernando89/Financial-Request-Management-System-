import { z } from 'zod';
import { ApiError } from './ApiError.js';

const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required.').optional(),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').optional(),
  contactNo: z.string().trim().refine((value) => {
    if (!value) return true;
    const digits = (value.match(/\d/g) || []).length;
    return digits >= 7 && digits <= 15 && /^[+]?[-()\s\d]+$/.test(value);
  }, 'Contact number must be a valid phone number.').optional(),
  address: z.string().trim().optional(),
  profileImageUrl: z.string().trim().optional()
});

export function parseProfileUpdate(input: unknown) {
  const result = profileUpdateSchema.safeParse(input);
  if (!result.success) throw new ApiError(400, result.error.issues[0].message);
  return result.data;
}
