import {
  ticketsRepository,
  TicketsRepository,
  type TicketRecord,
  type TicketStatus,
  type TicketPriority,
} from "../repositories/tickets.repository.js";
import { NotFoundError, BadRequestError, ForbiddenError } from "../errors/appError.js";
import { UserRole } from "../generated/prisma/enums.js";
import type { AuthenticatedUser } from "../types/express.js";
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

  async listTickets(
    query: ListTicketsQuery,
    user?: AuthenticatedUser
  ): Promise<PaginatedTicketsResult> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // CUSTOMER sees only their own tickets; AGENT and ADMIN see all tickets
    const createdById =
      user?.role === UserRole.CUSTOMER ? user.id : undefined;

    const [tickets, total] = await this.repo.findMany({
      status: query.status as TicketStatus | undefined,
      priority: query.priority as TicketPriority | undefined,
      category: query.category,
      assigneeId: query.assigneeId,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      createdById,
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

  async getTicketById(id: string, user?: AuthenticatedUser): Promise<TicketRecord> {
    const ticket = await this.repo.findById(id);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    // CUSTOMER can only access their own ticket; return 404 for another customer's ticket
    if (user && user.role === UserRole.CUSTOMER && ticket.createdById !== user.id) {
      throw new NotFoundError("Ticket not found");
    }

    return ticket;
  }

  async createTicket(
    input: CreateTicketInput,
    user: AuthenticatedUser
  ): Promise<TicketRecord> {
    // CUSTOMER cannot supply assigneeId
    if (user.role === UserRole.CUSTOMER && input.assigneeId) {
      throw new ForbiddenError("Customers are not permitted to assign tickets to agents");
    }

    const slaDueAt = input.slaDueAt ? new Date(input.slaDueAt) : undefined;
    const assigneeId =
      user.role === UserRole.AGENT || user.role === UserRole.ADMIN
        ? input.assigneeId
        : undefined;

    // Always derive createdById from authenticated user
    return this.repo.create({
      title: input.title,
      description: input.description,
      priority: input.priority as TicketPriority | undefined,
      category: input.category,
      createdById: user.id,
      assigneeId,
      slaDueAt,
    });
  }

  async updateTicket(
    id: string,
    input: UpdateTicketInput,
    user: AuthenticatedUser
  ): Promise<TicketRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Ticket not found");
    }

    // Role-based authorization for update
    if (user.role === UserRole.CUSTOMER) {
      // Must be own ticket
      if (existing.createdById !== user.id) {
        throw new NotFoundError("Ticket not found");
      }
      // Customer cannot update status or assigneeId
      if (input.status !== undefined || input.assigneeId !== undefined) {
        throw new ForbiddenError(
          "Customers cannot update ticket status or assignee"
        );
      }
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

  async deleteTicket(
    id: string,
    user: AuthenticatedUser
  ): Promise<{ id: string; deleted: boolean }> {
    // Only ADMIN may delete tickets
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenError("Only administrators are permitted to delete tickets");
    }

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
