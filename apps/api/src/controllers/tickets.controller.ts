import type { Request, Response, NextFunction } from "express";
import { ticketsService, TicketsService } from "../services/tickets.service.js";
import { successResponse } from "../utils/response.js";
import { UnauthorizedError } from "../errors/appError.js";
import type {
  ListTicketsQuery,
  CreateTicketInput,
  UpdateTicketInput,
} from "../schemas/ticket.schema.js";

export class TicketsController {
  constructor(private readonly service: TicketsService = ticketsService) {}

  listTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }
      const query = req.query as unknown as ListTicketsQuery;
      const result = await this.service.listTickets(query, req.user);
      res.status(200).json(
        successResponse(result.tickets, {
          pagination: result.pagination,
        })
      );
    } catch (err) {
      next(err);
    }
  };

  getTicketById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }
      const id = req.params.id as string;
      const ticket = await this.service.getTicketById(id, req.user);
      res.status(200).json(successResponse(ticket));
    } catch (err) {
      next(err);
    }
  };

  createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }
      const body = req.body as CreateTicketInput;
      const ticket = await this.service.createTicket(body, req.user);
      res.status(201).json(successResponse(ticket));
    } catch (err) {
      next(err);
    }
  };

  updateTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }
      const id = req.params.id as string;
      const body = req.body as UpdateTicketInput;
      const ticket = await this.service.updateTicket(id, body, req.user);
      res.status(200).json(successResponse(ticket));
    } catch (err) {
      next(err);
    }
  };

  deleteTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }
      const id = req.params.id as string;
      const result = await this.service.deleteTicket(id, req.user);
      res.status(200).json(successResponse(result));
    } catch (err) {
      next(err);
    }
  };
}

export const ticketsController = new TicketsController();
