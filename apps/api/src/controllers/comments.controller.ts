import type { Request, Response, NextFunction } from "express";
import {
  commentsService,
  CommentsService,
} from "../services/comments.service.js";
import { successResponse } from "../utils/response.js";
import { UnauthorizedError } from "../errors/appError.js";
import type { CreateCommentInput } from "../schemas/comment.schema.js";

export class CommentsController {
  constructor(private readonly service: CommentsService = commentsService) {}

  createComment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }
      const ticketId = req.params.ticketId as string;
      const body = req.body as CreateCommentInput;
      const comment = await this.service.createComment(ticketId, body, req.user);
      res.status(201).json(successResponse(comment));
    } catch (err) {
      next(err);
    }
  };

  listComments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }
      const ticketId = req.params.ticketId as string;
      const comments = await this.service.listComments(ticketId, req.user);
      res.status(200).json(successResponse(comments));
    } catch (err) {
      next(err);
    }
  };
}

export const commentsController = new CommentsController();

