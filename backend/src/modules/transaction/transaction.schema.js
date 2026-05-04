import { z } from 'zod';
import { verifyNUBAN } from '../../utils/nuban.js';


export const transferSchema = z.object({

  // EITHER recipientEmail OR accountNumber must be provided — not both, not neither.
  // We use .optional() on both fields and then use .refine() to enforce
  // that exactly one of them is present.
  recipientEmail: z.string().email('Invalid email address').toLowerCase().optional(),

  accountNumber: z.string()
    .regex(/^\d{10}$/, 'Account number must be exactly 10 digits')
    .refine((val) => verifyNUBAN(val), { message: 'Invalid account number' })
    .optional(),

  amount: z.number()
    .positive('Amount must be greater than 0')
    .multipleOf(0.01, 'Amount cannot have more than 2 decimal places'),

  description: z.string().max(100).optional(),

// .refine() at the object level validates the whole object at once.
// Here we check that the client sent exactly one of the two recipient fields.
}).refine(
  (data) => !!data.recipientEmail || !!data.accountNumber,
  {
    message: 'Either recipientEmail or accountNumber is required',
    // Attach error to recipientEmail field
    path: ['recipientEmail'],
  }
).refine(
  (data) => !(data.recipientEmail && data.accountNumber),
  {
    message: 'Provide either recipientEmail or accountNumber, not both',
    path: ['accountNumber'],
  }
);
export const paginationSchema = z.object({
    page: z.coerce.number().int().positive() .default(1),

    limit: z.coerce.number() .int() .positive() .max(50).default(10)
});