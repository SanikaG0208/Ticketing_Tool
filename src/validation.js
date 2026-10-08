import { z } from 'zod';

const name = z.string().trim().min(1).max(100);
const uuid = z.string().uuid();
export const schemas = {
  name: z.object({ name }).strict(),
  user: z.object({ name, email: z.string().email().max(254), password: z.string().min(12).max(128), department_id: uuid }).strict(),
  ticket: z.object({
    department_id: uuid,
    assigned_to: uuid.nullable().optional(),
    issue: name, poc_mode: z.enum(['auto','manual','other']).default('auto'), poc_other: z.string().trim().max(200).nullable().optional(),
    requirements: z.string().trim().min(1).max(4000),
    description: z.string().trim().min(1).max(20000),
    priority: z.enum(['Low', 'Medium', 'High']),
    send_email: z.boolean().default(false)
  }).strict(),
  status: z.object({ status: z.enum(['Open', 'In Progress', 'Waiting', 'Resolved', 'Closed']), waiting_reason: z.enum(['Employee','IT','Developer','Approval','HR','Vendor','Other']).nullable().optional(), waiting_other: z.string().trim().max(1000).nullable().optional() }).strict(),
  pagination: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) })
};

export function validate(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error('Invalid request');
    error.status = 422;
    error.details = result.error.issues.map(({ path, message }) => ({ field: path.join('.'), message }));
    throw error;
  }
  return result.data;
}
export function validateId(value) { return validate(uuid, value); }
export function screenshotType(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (buffer.subarray(0, 3).equals(Buffer.from([255,216,255]))) return 'image/jpeg';
  return null;
}
