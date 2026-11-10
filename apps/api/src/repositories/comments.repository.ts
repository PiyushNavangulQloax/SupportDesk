import { prisma } from "../config/database.js";
import { UserRole } from "../generated/prisma/enums.js";

export interface CommentRecord {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
  author?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export interface CreateCommentData {
  ticketId: string;
  authorId: string;
  body: string;
  isInternal?: boolean;
}

export class CommentsRepository {
  async create(data: CreateCommentData): Promise<CommentRecord> {
    return prisma.comment.create({
      data: {
        ticketId: data.ticketId,
        authorId: data.authorId,
        body: data.body,
        isInternal: data.isInternal ?? false,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async findByTicketId(
    ticketId: string,
    includeInternal: boolean = false
  ): Promise<CommentRecord[]> {
    const where: Record<string, unknown> = { ticketId };

    if (!includeInternal) {
      where.isInternal = false;
    }

    return prisma.comment.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }
}

export const commentsRepository = new CommentsRepository();

