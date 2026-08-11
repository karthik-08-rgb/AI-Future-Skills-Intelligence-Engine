import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import routes from "./routes";
import { notFoundHandler, errorHandler } from "./middleware/errors";
import { requestLogger } from "./middleware";
import { logger } from "./utils/logger";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: config.frontendUrl.split(",").map((s) => s.trim()),
      credentials: false,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));
  app.use(requestLogger);

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 240,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json({
          error: { code: "RATE_LIMITED", message: "Too many requests, please slow down" },
        });
      },
    }),
  );

  app.get("/", (_req, res) => {
    res.json({
      name: "AI Future Skills Intelligence Engine API",
      version: "1.0.0",
      status: "ok",
      docs: "/docs",
    });
  });

  app.use("/api", routes);

  // API documentation (minimal inline reference)
  app.get("/docs", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(
      `<html><body style="font-family:system-ui;max-width:760px;margin:40px auto">
      <h1>AI Future Skills Intelligence Engine — API</h1>
      <p>REST API, JSON in/out, Bearer token auth (<code>POST /api/auth/login</code>).</p>
      <h3>Key endpoints</h3>
      <pre>POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
GET    /api/meta/classifications
GET    /api/intelligence/dashboard
GET    /api/intelligence/future-skills
GET    /api/intelligence/declining-skills
GET    /api/intelligence/reskilling
GET    /api/intelligence/role/:id
GET    /api/intelligence/process/:id
GET    /api/explorer
POST   /api/assistant/query
GET    /api/recommendations
GET    /api/recommendations/:id
GET    /api/knowledge
POST   /api/knowledge/upload
POST   /api/data/import/upload
GET    /api/admin/metrics
GET    /api/health</pre>
      <p>See README and docs/architecture.md for full details.</p></body></html>`,
    );
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export function startServer() {
  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info("server.started", { port: config.port, env: config.env });
  });
  return server;
}
