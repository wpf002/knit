import fp from "fastify-plugin";
import { prisma } from "@knit/db";
import type { FastifyInstance } from "fastify";

// Decorates fastify with a shared prisma client and closes it on shutdown.
export default fp(async (app: FastifyInstance) => {
  app.decorate("prisma", prisma);
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});

declare module "fastify" {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}
