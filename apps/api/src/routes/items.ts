import type { FastifyInstance } from "fastify";
import { createItemSchema } from "@drobe/shared";

// NOTE: auth is stubbed. Until real sessions land, owner identity comes from an
// x-user-id header so the routes are exercisable end to end. Replace before any
// real data goes in.
function requireUser(req: { headers: Record<string, unknown> }): string {
  const id = req.headers["x-user-id"];
  if (typeof id !== "string" || !id) {
    throw Object.assign(new Error("Missing x-user-id (auth not wired yet)"), { statusCode: 401 });
  }
  return id;
}

export default async function itemRoutes(app: FastifyInstance) {
  // List items the current user is allowed to see.
  // Friend layer: CIRCLE items from accepted friends. Creator layer: FOLLOWER
  // items from people you follow. Plus your own closet. (Simplified query —
  // the visibility joins get richer as circles/follows fill in.)
  app.get("/items", async (req) => {
    const userId = requireUser(req);
    return app.prisma.closetItem.findMany({
      where: {
        status: "AVAILABLE",
        OR: [{ ownerId: userId }, { visibility: "PUBLIC" }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });

  app.get("/items/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const item = await app.prisma.closetItem.findUnique({ where: { id } });
    if (!item) return reply.code(404).send({ error: "Item not found" });
    return item;
  });

  // Add an item to your closet. Onboarding should make this feel like posting.
  app.post("/items", async (req, reply) => {
    const ownerId = requireUser(req);
    const parsed = createItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid item", issues: parsed.error.flatten() });
    }
    const item = await app.prisma.closetItem.create({
      data: { ...parsed.data, ownerId },
    });
    return reply.code(201).send(item);
  });
}
