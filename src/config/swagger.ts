import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const apiUrl = process.env["API_URL"] ?? "http://localhost:3000";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Airbnb API",
      version: "2.0.0",
      description:
        "A full-featured REST API mimicking Airbnb — users, listings, bookings, JWT authentication, email notifications, Cloudinary uploads, UUID IDs, and API versioning.",
    },
    servers: [
      { url: `${apiUrl}/api/v1`, description: "Current server" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Paste your JWT token from POST /auth/login",
        },
      },
    },
  },
  apis: ["./src/routes/v1/*.ts"],
};

const spec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));
  app.get("/api-docs.json", (_req, res) => res.json(spec));
  console.log(`Swagger docs: ${apiUrl}/api-docs`);
}
