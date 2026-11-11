import {
  commentsRepository,
  CommentsRepository,
  type CommentRecord,
} from "../repositories/comments.repository.js";
import {
  ticketsRepository,
  TicketsRepository,
} from "../repositories/tickets.repository.js";
import { NotFoundError, ForbiddenError } from "../errors/appError.js";
import { UserRole } from "../generated/prisma/enums.js";
import type { AuthenticatedUser } from "../types/express.js";
import type { CreateCommentInput } from "../schemas/comment.schema.js";

export class CommentsService {
  constructor(
    private readonly commentsRepo: CommentsRepository = commentsRepository,
    private readonly ticketsRepo: TicketsRepository = ticketsRepository
  ) {}

  async createComment(
    ticketId: string,
    input: CreateCommentInput,
    user: AuthenticatedUser
  ): Promise<CommentRecord> {
    const ticket = await this.ticketsRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    // Role-based authorization for creating comments
    if (user.role === UserRole.CUSTOMER) {
      // Customer can comment only on their own tickets (404 prevents resource enumeration)
      if (ticket.createdById !== user.id) {
        throw new NotFoundError("Ticket not found");
      }
      // Customer cannot create internal comments
      if (input.isInternal === true) {
        throw new ForbiddenError(
          "Customers are not permitted to create internal comments"
        );
      }
    }

    const isInternal =
      user.role === UserRole.CUSTOMER ? false : Boolean(input.isInternal);

    // Strictly derive authorId from authenticated user identity
    return this.commentsRepo.create({
      ticketId,
      authorId: user.id,
      body: input.body,
      isInternal,
    });
  }

  async listComments(
    ticketId: string,
    user: AuthenticatedUser
  ): Promise<CommentRecord[]> {
    const ticket = await this.ticketsRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    // Role-based authorization for listing comments
    if (user.role === UserRole.CUSTOMER) {
      // Customer can only access comments on their own ticket
      if (ticket.createdById !== user.id) {
        throw new NotFoundError("Ticket not found");
      }
    }

    // Only AGENT and ADMIN roles are permitted to see internal staff comments
    const includeInternal =
      user.role === UserRole.AGENT || user.role === UserRole.ADMIN;

    return this.commentsRepo.findByTicketId(ticketId, includeInternal);
  }
}

export const commentsService = new CommentsService();

