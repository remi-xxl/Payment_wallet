import { z } from 'zod';

export const transferSchema = z.object({
    recipientEmail: z.email('Invalid recipent email').toLowerCase(),


    amount: z.number()
    .positive('Amount must be greater than 0')
    .multipleOf(0.01,' Amount cannot have more than 2 decimal places'),
 

    description: z.string() .max(100) .optional(),

});

export const paginationSchema = z.object({
    page: z.coerce.number().int().positive() .default(1),

    limit: z.coerce.number() .int() .positive() .max(50).default(10)
});