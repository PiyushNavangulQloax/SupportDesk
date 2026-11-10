import { Router } from "express";
import { ticketsController } from "../controllers/tickets.controller.js";
import { commentsRouter } from "./comments.routes.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authenticate, authorize, UserRole } from "../middleware/auth.middleware.js";
import {
  ticketIdParamSchema,
  listTicketsQuerySchema,
  createTicketBodySchema,
  updateTicketBodySchema,
} from "../schemas/ticket.schema.js";

export const ticketsRouter = Router();

// Apply authenticate to all ticket endpoints
ticketsRouter.use(authenticate);

// Mount comments nested router
ticketsRouter.use("/:ticketId/comments", commentsRouter);

ticketsRouter.get(
  "/",
  validateRequest({ query: listTicketsQuerySchema }),
  ticketsController.listTickets
);

ticketsRouter.get(
  "/:id",
  validateRequest({ params: ticketIdParamSchema }),
  ticketsController.getTicketById
);

ticketsRouter.post(
  "/",
  validateRequest({ body: createTicketBodySchema }),
  ticketsController.createTicket
);

ticketsRouter.patch(
  "/:id",
  validateRequest({
    params: ticketIdParamSchema,
    body: updateTicketBodySchema,
  }),
  ticketsController.updateTicket
);

ticketsRouter.delete(
  "/:id",
  authorize(UserRole.ADMIN),
  validateRequest({ params: ticketIdParamSchema }),
  ticketsController.deleteTicket
);
