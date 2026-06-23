import type { FastifyInstance } from "fastify";
import { requireUser } from "../lib/auth.js";

// Owner attribution travels with every feed item — the feed is about *whose*
// closet, not just what's in it.
const ownerSelect = {
  id: true,
  handle: true,
  displayName: true,
  avatarUrl: true,
  isCreator: true,
} as const;

// Collapse the per-user `savedBy` include into a single `saved` boolean.
function decorate<T extends { savedBy: { id: string }[] }>(item: T) {
  const { savedBy, ...rest } = item;
  return { ...rest, saved: savedBy.length > 0 };
}

export default async function feedRoutes(app: FastifyInstance) {
  // CIRCLE feed (friend layer). CIRCLE-visibility items from people you're
  // actually close to: accepted friends + anyone who shares a circle with you.
  app.get("/feed/circle", async (req) => {
    const me = requireUser(req);

    const friendships = await app.prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: me }, { addresseeId: me }] },
      select: { requesterId: true, addresseeId: true },
    });
    const friendIds = friendships.map((f) => (f.requesterId === me ? f.addresseeId : f.requesterId));

    const myCircles = await app.prisma.circleMembership.findMany({
      where: { userId: me },
      select: { circleId: true },
    });
    const circleIds = myCircles.map((c) => c.circleId);
    const coMembers = circleIds.length
      ? await app.prisma.circleMembership.findMany({
          where: { circleId: { in: circleIds }, userId: { not: me } },
          select: { userId: true },
        })
      : [];

    const ownerIds = Array.from(new Set([...friendIds, ...coMembers.map((c) => c.userId)]));
    if (ownerIds.length === 0) return [];

    const items = await app.prisma.closetItem.findMany({
      where: { ownerId: { in: ownerIds }, visibility: "CIRCLE", status: "AVAILABLE" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { owner: { select: ownerSelect }, savedBy: { where: { userId: me }, select: { id: true } } },
    });
    return items.map(decorate);
  });

  // DISCOVER feed (creator layer). FOLLOWER-visibility items from creators you
  // follow, plus anything PUBLIC. Never your own closet.
  app.get("/feed/discover", async (req) => {
    const me = requireUser(req);

    const follows = await app.prisma.follow.findMany({
      where: { followerId: me },
      select: { followeeId: true },
    });
    const followeeIds = follows.map((f) => f.followeeId);

    const or: Array<{ visibility: "FOLLOWER" | "PUBLIC"; ownerId?: { in: string[] } }> = [
      { visibility: "PUBLIC" },
    ];
    if (followeeIds.length) or.unshift({ visibility: "FOLLOWER", ownerId: { in: followeeIds } });

    const items = await app.prisma.closetItem.findMany({
      where: { status: "AVAILABLE", ownerId: { not: me }, OR: or },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { owner: { select: ownerSelect }, savedBy: { where: { userId: me }, select: { id: true } } },
    });
    return items.map(decorate);
  });

  // Your saved (wishlist) items.
  app.get("/saved", async (req) => {
    const me = requireUser(req);
    const saved = await app.prisma.savedItem.findMany({
      where: { userId: me },
      orderBy: { createdAt: "desc" },
      include: { item: { include: { owner: { select: ownerSelect } } } },
    });
    return saved.map((s) => ({ ...s.item, saved: true }));
  });

  // Save / unsave. Idempotent — the unique (userId,itemId) makes save a no-op if
  // already saved, and unsave a no-op if not.
  app.post("/items/:id/save", async (req, reply) => {
    const me = requireUser(req);
    const { id } = req.params as { id: string };
    const item = await app.prisma.closetItem.findUnique({ where: { id }, select: { id: true } });
    if (!item) return reply.code(404).send({ error: "Item not found" });
    await app.prisma.savedItem.upsert({
      where: { userId_itemId: { userId: me, itemId: id } },
      update: {},
      create: { userId: me, itemId: id },
    });
    return { saved: true };
  });

  app.delete("/items/:id/save", async (req, reply) => {
    const me = requireUser(req);
    const { id } = req.params as { id: string };
    await app.prisma.savedItem.deleteMany({ where: { userId: me, itemId: id } });
    return reply.code(204).send();
  });
}
