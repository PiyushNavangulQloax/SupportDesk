import { z } from "zod";

// PostgreSQL accepts any 32 hex digits with hyphens (including deterministic seeds)
export const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export const uuidSchema = z.string().regex(UUID_REGEX, "Invalid UUID format: must be a valid UUID");

export const ticketIdParamSchema = z.object({
  id: uuidSchema,
});

export const listTicketsQuerySchema = z.object({
  status: z
    .enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"])
    .optional(),
  priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
  category: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createTicketBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(255, "Title must not exceed 255 characters"),
  description: z
    .string()
    .trim()
    .min(5, "Description must be at least 5 characters"),
  priority: z.enum(["P1", "P2", "P3", "P4"]).default("P3"),
  category: z.string().trim().max(100).optional(),
  createdById: uuidSchema,
  assigneeId: uuidSchema.optional(),
  slaDueAt: z.string().datetime().optional(),
});

export const updateTicketBodySchema = z
  .object({
    title: z.string().trim().min(3).max(255).optional(),
    description: z.string().trim().min(5).optional(),
    status: z
      .enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"])
      .optional(),
    priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
    category: z.string().trim().max(100).nullable().optional(),
    assigneeId: uuidSchema.nullable().optional(),
    slaDueAt: z.string().datetime().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  });

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type CreateTicketInput = z.infer<typeof createTicketBodySchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketBodySchema>;
