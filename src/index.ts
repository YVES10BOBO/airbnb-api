import "dotenv/config";
import express, { Request, Response } from "express";
import usersRouter from "./routes/users.routes";
import listingsRouter from "./routes/listings.routes";

const app = express();
const PORT = 3000;

app.use(express.json());

app.use("/users", usersRouter);
app.use("/listings", listingsRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.listen(PORT, () => {
  console.log(`Airbnb API running on http://localhost:${PORT}`);
});
