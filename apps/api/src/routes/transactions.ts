import type { FastifyInstance } from "fastify";
import { createTransactionSchema } from "@knit/shared";

export default async function transactionRoutes(app: FastifyInstance) {
  // Request to rent / buy / receive an item. The server resolves the LAYER from
  // the relationship between the two users and prices accordingly:
  //   - friends (mutual) renting        => FRIEND layer, free
  //   - follower renting a creator item => CREATOR layer, paid
  // This is the heart of the two-layer model. Pricing + Stripe land at build
  // step 4; for now it records the request and infers the layer.
  app.post("/transactions", async (req, reply) => {
    const counterpartyId = req.headers["x-user-id"];
    if (typeof counterpartyId !== "string" || !counterpartyId) {
      return reply.code(401).send({ error: "Missing x-user-id (auth not wired yet)" });
    }
    const parsed = createTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request", issues: parsed.error.flatten() });
    }

    const item = await app.prisma.closetItem.findUnique({ where: { id: parsed.data.itemId } });
    if (!item) return reply.code(404).send({ error: "Item not found" });

    const areFriends = await app.prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: item.ownerId, addresseeId: counterpartyId },
          { requesterId: counterpartyId, addresseeId: item.ownerId },
        ],
      },
    });

    const layer = areFriends ? "FRIEND" : "CREATOR";
    const priceCents =
      parsed.data.kind === "RENT"
        ? layer === "FRIEND"
          ? 0 // free among friends, by design
          : (item.rentDailyCents ?? null)
        : parsed.data.kind === "BUY"
          ? (item.buyCents ?? null)
          : 0; // giveaway

    const tx = await app.prisma.transaction.create({
      data: {
        itemId: item.id,
        ownerId: item.ownerId,
        counterpartyId,
        kind: parsed.data.kind,
        layer,
        priceCents,
        startDate: parsed.data.startDate ?? null,
        endDate: parsed.data.endDate ?? null,
      },
    });
    return reply.code(201).send(tx);
  });
}
