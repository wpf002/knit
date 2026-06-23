import type { FastifyInstance } from "fastify";
import { createItemSchema, updateItemSchema } from "@knit/shared";
import { requireUser } from "../lib/auth.js";

export default async function itemRoutes(app: FastifyInstance) {
  // List items the current user is allowed to see.
  // Friend layer: CIRCLE items from accepted friends. Creator layer: FOLLOWER
  // items from people you follow. Plus your own closet. (Simplified query —
  // the visibility joins get richer in Phase 2 when the feeds land.)
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

  // The current user's own closet — every status, so they can manage it. This
  // is the Phase 1 "closet = profile" surface.
  app.get("/closet", async (req) => {
    const ownerId = requireUser(req);
    return app.prisma.closetItem.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
  });

  app.get("/items/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const item = await app.prisma.closetItem.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            isCreator: true,
            heightCm: true,
            usualSize: true,
          },
        },
      },
    });
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

  // Edit an item you own.
  app.patch("/items/:id", async (req, reply) => {
    const ownerId = requireUser(req);
    const { id } = req.params as { id: string };
    const parsed = updateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid item", issues: parsed.error.flatten() });
    }
    const existing = await app.prisma.closetItem.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Item not found" });
    if (existing.ownerId !== ownerId) {
      return reply.code(403).send({ error: "Not your item" });
    }
    const item = await app.prisma.closetItem.update({ where: { id }, data: parsed.data });
    return item;
  });

  // Remove an item you own. If it has transaction history we archive instead of
  // hard-deleting, so the record (and any ratings) survive.
  app.delete("/items/:id", async (req, reply) => {
    const ownerId = requireUser(req);
    const { id } = req.params as { id: string };
    const existing = await app.prisma.closetItem.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true } } },
    });
    if (!existing) return reply.code(404).send({ error: "Item not found" });
    if (existing.ownerId !== ownerId) {
      return reply.code(403).send({ error: "Not your item" });
    }
    if (existing._count.transactions > 0) {
      await app.prisma.closetItem.update({ where: { id }, data: { status: "ARCHIVED" } });
      return reply.send({ archived: true });
    }
    await app.prisma.closetItem.delete({ where: { id } });
    return reply.code(204).send();
  });
}
