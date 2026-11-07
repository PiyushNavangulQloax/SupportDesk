import { prisma } from "../config/database.js";
import {
  TicketStatus,
  TicketPriority,
} from "../generated/prisma/enums.js";

export { TicketStatus, TicketPriority };

export interface TicketRecord {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  createdById: string;
  assigneeId: string | null;
  slaDueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { id: string; name: string; email: string };
  assignee?: { id: string; name: string; email: string } | null;
}

export interface ListTicketsFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  skip?: number;
  take?: number;
}

export interface CreateTicketData {
  title: string;
  description: string;
  priority?: TicketPriority;
  category?: string;
  createdById: string;
  assigneeId?: string;
  slaDueAt?: Date;
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string | null;
  assigneeId?: string | null;
  slaDueAt?: Date | null;
}

export class TicketsRepository {
  async findMany(filters: ListTicketsFilters = {}): Promise<[TicketRecord[], number]> {
    const where: Record<string, unknown> = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.category) {
      where.category = {
        contains: filters.category,
        mode: "insensitive",
      };
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          assignee: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return [tickets, total];
  }

  async findById(id: string): Promise<TicketRecord | null> {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async create(data: CreateTicketData): Promise<TicketRecord> {
    return prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        createdById: data.createdById,
        assigneeId: data.assigneeId,
        slaDueAt: data.slaDueAt,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async update(id: string, data: UpdateTicketData): Promise<TicketRecord> {
    return prisma.ticket.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async delete(id: string): Promise<TicketRecord> {
    return prisma.ticket.delete({
      where: { id },
    });
  }

  async countRelations(id: string): Promise<{ commentsCount: number; attachmentsCount: number }> {
    const [commentsCount, attachmentsCount] = await Promise.all([
      prisma.comment.count({ where: { ticketId: id } }),
      prisma.attachment.count({ where: { ticketId: id } }),
    ]);

    return { commentsCount, attachmentsCount };
  }
}

export const ticketsRepository = new TicketsRepository();
