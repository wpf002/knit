import Fastify from "fastify";
import cors from "@fastify/cors";
import prismaPlugin from "./plugins/prisma.js";
import healthRoutes from "./routes/health.js";
import itemRoutes from "./routes/items.js";
import transactionRoutes from "./routes/transactions.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(prismaPlugin);

  await app.register(healthRoutes);
  await app.register(itemRoutes);
  await app.register(transactionRoutes);

  return app;
}
