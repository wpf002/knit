import type { FastifyInstance } from "fastify";
import { stylistSchema } from "@knit/shared";
import { requireUser } from "../lib/auth.js";
import { recommend, type StylableItem } from "../lib/stylist.js";

const ownerSelect = {
  id: true,
  handle: true,
  displayName: true,
  avatarUrl: true,
  isCreator: true,
} as const;

// Phase 7: the AI stylist. Plus-gated. Recommends from the items the user can
// actually access across both layers — their network's real closets.
export default async function stylistRoutes(app: FastifyInstance) {
  app.post("/stylist", async (req, reply) => {
    const me = requireUser(req);
    const parsed = stylistSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "What's the occasion?" });

    // Plus gate — the assistant is the subscription's justification.
    const sub = await app.prisma.subscription.findUnique({ where: { userId: me } });
    if (!sub || sub.tier !== "PLUS" || sub.status !== "ACTIVE") {
      return reply.code(402).send({ error: "Knit Plus required", upgrade: true });
    }

    // Build the accessible candidate set: friends' CIRCLE items, followed
    // creators' FOLLOWER items, and anything PUBLIC — never your own.
    const friendships = await app.prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: me }, { addresseeId: me }] },
      select: { requesterId: true, addresseeId: true },
    });
    const friendIds = friendships.map((f) => (f.requesterId === me ? f.addresseeId : f.requesterId));
    const myCircles = await app.prisma.circleMembership.findMany({
      where: { userId: me },
      select: { circleId: true },
    });
    const coMembers = myCircles.length
      ? await app.prisma.circleMembership.findMany({
          where: { circleId: { in: myCircles.map((c) => c.circleId) }, userId: { not: me } },
          select: { userId: true },
        })
      : [];
    const circleOwnerIds = Array.from(new Set([...friendIds, ...coMembers.map((c) => c.userId)]));
    const follows = await app.prisma.follow.findMany({
      where: { followerId: me },
      select: { followeeId: true },
    });
    const followeeIds = follows.map((f) => f.followeeId);

    const or: Array<Record<string, unknown>> = [{ visibility: "PUBLIC" }];
    if (circleOwnerIds.length) or.push({ visibility: "CIRCLE", ownerId: { in: circleOwnerIds } });
    if (followeeIds.length) or.push({ visibility: "FOLLOWER", ownerId: { in: followeeIds } });

    const items = await app.prisma.closetItem.findMany({
      where: { status: "AVAILABLE", ownerId: { not: me }, OR: or as never },
      include: { owner: { select: ownerSelect } },
      take: 200,
    });

    const candidates: StylableItem[] = items.map((it) => ({
      id: it.id,
      title: it.title,
      brand: it.brand,
      category: it.category,
      color: it.color,
      rentable: it.rentable,
      rentDailyCents: it.rentDailyCents,
      buyable: it.buyable,
      giveable: it.giveable,
      ownerHandle: it.owner.handle,
      layer: circleOwnerIds.includes(it.ownerId) && it.visibility === "CIRCLE" ? "FRIEND" : "CREATOR",
    }));

    const recs = recommend(parsed.data.occasion, candidates);
    const byId = new Map(items.map((it) => [it.id, it]));
    return recs.map((r) => ({ ...byId.get(r.id), reason: r.reason }));
  });
}
