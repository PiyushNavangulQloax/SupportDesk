import type { Request, Response, NextFunction } from "express";
import { ticketsService, TicketsService } from "../services/tickets.service.js";
import { successResponse } from "../utils/response.js";

export class TicketsController {
  constructor(private readonly service: TicketsService = ticketsService) {}

  listTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listTickets(req.query as any);
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
      const id = req.params.id as string;
      const ticket = await this.service.getTicketById(id);
      res.status(200).json(successResponse(ticket));
    } catch (err) {
      next(err);
    }
  };

  createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ticket = await this.service.createTicket(req.body);
      res.status(201).json(successResponse(ticket));
    } catch (err) {
      next(err);
    }
  };

  updateTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const ticket = await this.service.updateTicket(id, req.body);
      res.status(200).json(successResponse(ticket));
    } catch (err) {
      next(err);
    }
  };

  deleteTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.service.deleteTicket(id);
      res.status(200).json(successResponse(result));
    } catch (err) {
      next(err);
    }
  };
}

export const ticketsController = new TicketsController();
