import {
  ticketsRepository,
  TicketsRepository,
  type TicketRecord,
  type TicketStatus,
  type TicketPriority,
} from "../repositories/tickets.repository.js";
import { NotFoundError, BadRequestError } from "../errors/appError.js";
import type {
  ListTicketsQuery,
  CreateTicketInput,
  UpdateTicketInput,
} from "../schemas/ticket.schema.js";

export interface PaginatedTicketsResult {
  tickets: TicketRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class TicketsService {
  constructor(private readonly repo: TicketsRepository = ticketsRepository) {}

  async listTickets(query: ListTicketsQuery): Promise<PaginatedTicketsResult> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [tickets, total] = await this.repo.findMany({
      status: query.status as TicketStatus | undefined,
      priority: query.priority as TicketPriority | undefined,
      category: query.category,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getTicketById(id: string): Promise<TicketRecord> {
    const ticket = await this.repo.findById(id);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }
    return ticket;
  }

  async createTicket(input: CreateTicketInput): Promise<TicketRecord> {
    const slaDueAt = input.slaDueAt ? new Date(input.slaDueAt) : undefined;

    return this.repo.create({
      title: input.title,
      description: input.description,
      priority: input.priority as TicketPriority | undefined,
      category: input.category,
      createdById: input.createdById,
      assigneeId: input.assigneeId,
      slaDueAt,
    });
  }

  async updateTicket(id: string, input: UpdateTicketInput): Promise<TicketRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Ticket not found");
    }

    const slaDueAt =
      input.slaDueAt === null
        ? null
        : input.slaDueAt !== undefined
        ? new Date(input.slaDueAt)
        : undefined;

    return this.repo.update(id, {
      title: input.title,
      description: input.description,
      status: input.status as TicketStatus | undefined,
      priority: input.priority as TicketPriority | undefined,
      category: input.category,
      assigneeId: input.assigneeId,
      slaDueAt,
    });
  }

  async deleteTicket(id: string): Promise<{ id: string; deleted: boolean }> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Ticket not found");
    }

    const { commentsCount, attachmentsCount } = await this.repo.countRelations(id);
    if (commentsCount > 0 || attachmentsCount > 0) {
      throw new BadRequestError(
        "Cannot delete ticket with existing comments or attachments"
      );
    }

    await this.repo.delete(id);
    return { id, deleted: true };
  }
}

export const ticketsService = new TicketsService();
