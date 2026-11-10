import { Router } from "express";
import { commentsController } from "../controllers/comments.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  ticketIdParamSchema,
  createCommentBodySchema,
} from "../schemas/comment.schema.js";

// mergeParams: true allows access to :ticketId from parent ticket router
export const commentsRouter = Router({ mergeParams: true });

commentsRouter.get(
  "/",
  validateRequest({ params: ticketIdParamSchema }),
  commentsController.listComments
);

commentsRouter.post(
  "/",
  validateRequest({
    params: ticketIdParamSchema,
    body: createCommentBodySchema,
  }),
  commentsController.createComment
);

