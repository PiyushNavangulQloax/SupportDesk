import { Router } from "express";
import { ticketsController } from "../controllers/tickets.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  ticketIdParamSchema,
  listTicketsQuerySchema,
  createTicketBodySchema,
  updateTicketBodySchema,
} from "../schemas/ticket.schema.js";

export const ticketsRouter = Router();

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
  validateRequest({ params: ticketIdParamSchema }),
  ticketsController.deleteTicket
);
