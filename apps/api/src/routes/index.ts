import { Router } from "express";
import { ticketsRouter } from "./tickets.routes.js";

export const apiRouter = Router();

apiRouter.use("/tickets", ticketsRouter);
