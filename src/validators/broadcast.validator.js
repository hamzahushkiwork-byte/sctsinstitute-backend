import { z } from 'zod';

export const broadcastEmailSchema = z
  .object({
    subject: z.string().min(1, 'Subject is required').max(200),
    text: z.string().max(100000).optional().default(''),
    html: z.string().max(100000).optional().default(''),
    includeAdmins: z.coerce.boolean().optional().default(false),
  })
  .refine((data) => data.text.trim().length > 0 || data.html.trim().length > 0, {
    message: 'Provide message text or HTML',
    path: ['text'],
  });
