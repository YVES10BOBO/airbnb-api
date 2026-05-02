import "dotenv/config";
import express, { Request, Response } from "express";
import compression from "compression";
import morgan from "morgan";
import v1Router from "./routes/v1/index";
import { errorHandler } from "./middlewares/errorHandler";
import { connectDB } from "./config/prisma";
import { setupSwagger } from "./config/swagger";
import { generalLimiter } from "./middlewares/rateLimiter";

const app = express();
const PORT = Number(process.env["PORT"]) || 3000;

app.use(process.env["NODE_ENV"] === "production" ? morgan("combined") : morgan("dev"));
app.use(compression());
app.use(express.json());
app.use(generalLimiter);

setupSwagger(app);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date() });
});

app.use("/api/v1", v1Router);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Airbnb API running on http://localhost:${PORT}`);
  });
});
