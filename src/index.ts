import "dotenv/config";
import express, { Request, Response } from "express";
import authRouter from "./routes/auth.routes";
import usersRouter from "./routes/users.routes";
import listingsRouter from "./routes/listings.routes";
import bookingsRouter from "./routes/bookings.routes";
import uploadRouter from "./routes/upload.routes";
import { errorHandler } from "./middlewares/errorHandler";
import { connectDB } from "./config/prisma";
import { setupSwagger } from "./config/swagger";

const app = express();
const PORT = Number(process.env["PORT"]) || 3000;

app.use(express.json());

setupSwagger(app);

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/listings", listingsRouter);
app.use("/bookings", bookingsRouter);
app.use("/", uploadRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Airbnb API running on http://localhost:${PORT}`);
  });
});
