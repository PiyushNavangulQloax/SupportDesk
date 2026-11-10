import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { openapiSpecification } from "../docs/openapi.js";

export const docsRouter = Router();

// Expose raw OpenAPI JSON specification
docsRouter.get("/openapi.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json(openapiSpecification);
});

// Serve interactive Swagger UI
docsRouter.use(
  "/",
  swaggerUi.serve,
  swaggerUi.setup(openapiSpecification, {
    customSiteTitle: "SupportDesk API Documentation",
  })
);

