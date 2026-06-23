import Fastify from "fastify";
import cors from "@fastify/cors";
import prismaPlugin from "./plugins/prisma.js";
import healthRoutes from "./routes/health.js";
import userRoutes from "./routes/users.js";
import itemRoutes from "./routes/items.js";
import feedRoutes from "./routes/feed.js";
import transactionRoutes from "./routes/transactions.js";
import billingRoutes from "./routes/billing.js";
import subscriptionRoutes from "./routes/subscription.js";
import stylistRoutes from "./routes/stylist.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(prismaPlugin);

  await app.register(healthRoutes);
  await app.register(userRoutes);
  await app.register(itemRoutes);
  await app.register(feedRoutes);
  await app.register(transactionRoutes);
  await app.register(billingRoutes);
  await app.register(subscriptionRoutes);
  await app.register(stylistRoutes);

  return app;
}
