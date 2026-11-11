import { z } from "zod";
import { uuidSchema } from "./ticket.schema.js";

export const ticketIdParamSchema = z.object({
  ticketId: uuidSchema,
});

export const createCommentBodySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Comment body cannot be empty")
    .max(5000, "Comment body cannot exceed 5000 characters"),
  isInternal: z.boolean().default(false),
});

export type CreateCommentInput = z.infer<typeof createCommentBodySchema>;

