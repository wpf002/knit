import type { FastifyInstance } from "fastify";
import {
  createTransactionSchema,
  txActionSchema,
  checkoutSchema,
  reportDamageSchema,
  rateBodySchema,
  type TxAction,
} from "@knit/shared";
import { requireUser } from "../lib/auth.js";
import { payments, platformFeeCents } from "../lib/stripe.js";

const partySelect = {
  id: true,
  handle: true,
  displayName: true,
  avatarUrl: true,
  isCreator: true,
} as const;

const txInclude = {
  item: { select: { id: true, title: true, photos: true, status: true } },
  owner: { select: partySelect },
  counterparty: { select: partySelect },
} as const;

const DAY_MS = 86_400_000;

export default async function transactionRoutes(app: FastifyInstance) {
  // Request to rent / buy / receive an item. The server resolves the LAYER from
  // the relationship between the two users and prices accordingly:
  //   - friends (mutual) renting        => FRIEND layer, free
  //   - follower renting a creator item => CREATOR layer, paid (rent + deposit)
  app.post("/transactions", async (req, reply) => {
    const counterpartyId = requireUser(req);
    const parsed = createTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request", issues: parsed.error.flatten() });
    }

    const item = await app.prisma.closetItem.findUnique({ where: { id: parsed.data.itemId } });
    if (!item) return reply.code(404).send({ error: "Item not found" });
    if (item.ownerId === counterpartyId) {
      return reply.code(400).send({ error: "You can't borrow your own item" });
    }

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

    // Pricing. Friend-layer rentals are free; creator-layer rentals charge
    // (daily × days) + platform fee, and hold the item's deposit.
    const { kind, startDate, endDate } = parsed.data;
    const days =
      kind === "RENT" && startDate && endDate
        ? Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS))
        : 1;

    let priceCents: number | null = 0;
    let feeCents = 0;
    let depositCents = 0;
    if (kind === "RENT") {
      if (layer === "FRIEND") {
        priceCents = 0;
      } else {
        priceCents = (item.rentDailyCents ?? 0) * days;
        feeCents = platformFeeCents(priceCents);
        depositCents = item.depositCents ?? 0;
      }
    } else if (kind === "BUY") {
      priceCents = item.buyCents ?? null;
      if (layer === "CREATOR" && priceCents) feeCents = platformFeeCents(priceCents);
    } else {
      priceCents = 0; // giveaway
    }

    const tx = await app.prisma.transaction.create({
      data: {
        itemId: item.id,
        ownerId: item.ownerId,
        counterpartyId,
        kind,
        layer,
        priceCents,
        platformFeeCents: feeCents,
        depositCents,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      },
      include: txInclude,
    });
    return reply.code(201).send(tx);
  });

  // A single transaction (owner or counterparty only) — backs the checkout page.
  app.get("/transactions/:id", async (req, reply) => {
    const me = requireUser(req);
    const { id } = req.params as { id: string };
    const tx = await app.prisma.transaction.findUnique({ where: { id }, include: txInclude });
    if (!tx) return reply.code(404).send({ error: "Transaction not found" });
    if (tx.ownerId !== me && tx.counterpartyId !== me) {
      return reply.code(403).send({ error: "Not your transaction" });
    }
    return tx;
  });

  app.get("/transactions/incoming", async (req) => {
    const me = requireUser(req);
    return app.prisma.transaction.findMany({
      where: { ownerId: me },
      orderBy: { createdAt: "desc" },
      include: txInclude,
    });
  });

  app.get("/transactions/outgoing", async (req) => {
    const me = requireUser(req);
    return app.prisma.transaction.findMany({
      where: { counterpartyId: me },
      orderBy: { createdAt: "desc" },
      include: txInclude,
    });
  });

  // Checkout a paid rental: pay from the in-app wallet if it covers the total,
  // otherwise authorize rent + deposit via the payments provider and return a
  // clientSecret for the renter to confirm.
  app.post("/transactions/:id/checkout", async (req, reply) => {
    const me = requireUser(req);
    const { id } = req.params as { id: string };
    const parsed = checkoutSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "Invalid checkout" });

    const tx = await app.prisma.transaction.findUnique({ where: { id } });
    if (!tx) return reply.code(404).send({ error: "Transaction not found" });
    if (tx.counterpartyId !== me) return reply.code(403).send({ error: "Not your rental" });
    if (tx.paymentStatus !== "REQUIRES_PAYMENT") {
      return reply.code(409).send({ error: `Nothing to pay (${tx.paymentStatus})` });
    }

    const total = (tx.priceCents ?? 0) + tx.depositCents;

    if (parsed.data.useWallet) {
      const me_ = await app.prisma.user.findUnique({ where: { id: me }, select: { walletCents: true } });
      if ((me_?.walletCents ?? 0) < total) {
        return reply.code(402).send({ error: "Wallet balance too low" });
      }
      await app.prisma.$transaction([
        app.prisma.user.update({ where: { id: me }, data: { walletCents: { decrement: total } } }),
        app.prisma.transaction.update({ where: { id }, data: { paymentStatus: "PAID" } }),
      ]);
      return { paid: true, method: "wallet", totalCents: total };
    }

    const owner = await app.prisma.user.findUnique({
      where: { id: tx.ownerId },
      select: { stripeConnectId: true },
    });
    const auth = await payments.authorizeRental({
      rentCents: tx.priceCents ?? 0,
      depositCents: tx.depositCents,
      feeCents: tx.platformFeeCents,
      connectedAccountId: owner?.stripeConnectId ?? null,
    });
    await app.prisma.transaction.update({
      where: { id },
      data: { stripePaymentIntentId: auth.paymentIntentId },
    });
    return {
      paid: false,
      method: "card",
      clientSecret: auth.clientSecret,
      rentCents: tx.priceCents ?? 0,
      depositCents: tx.depositCents,
      totalCents: total,
    };
  });

  // Confirm a card payment. In live mode a Stripe webhook would do this; with
  // the simulated provider the client calls it after "confirming".
  app.post("/transactions/:id/confirm", async (req, reply) => {
    const me = requireUser(req);
    const { id } = req.params as { id: string };
    const tx = await app.prisma.transaction.findUnique({ where: { id } });
    if (!tx) return reply.code(404).send({ error: "Transaction not found" });
    if (tx.counterpartyId !== me) return reply.code(403).send({ error: "Not your rental" });
    if (tx.paymentStatus !== "REQUIRES_PAYMENT") {
      return reply.code(409).send({ error: `Can't confirm (${tx.paymentStatus})` });
    }
    return app.prisma.transaction.update({
      where: { id },
      data: { paymentStatus: "PAID" },
      include: txInclude,
    });
  });

  // Owner reports damage on a live rental: capture part/all of the deposit into
  // their wallet, refund the rest, and close out.
  app.post("/transactions/:id/report-damage", async (req, reply) => {
    const me = requireUser(req);
    const { id } = req.params as { id: string };
    const parsed = reportDamageSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid report" });

    const tx = await app.prisma.transaction.findUnique({ where: { id } });
    if (!tx) return reply.code(404).send({ error: "Transaction not found" });
    if (tx.ownerId !== me) return reply.code(403).send({ error: "Only the owner can report damage" });
    if (tx.status !== "ACTIVE") return reply.code(409).send({ error: "Rental isn't active" });

    const captured = Math.min(parsed.data.amountCents, tx.depositCents);
    const earnings = (tx.priceCents ?? 0) - tx.platformFeeCents + captured;
    if (tx.stripePaymentIntentId) {
      await payments.capture(tx.stripePaymentIntentId);
      await payments.refund(tx.stripePaymentIntentId, tx.depositCents - captured);
    }
    const [updated] = await app.prisma.$transaction([
      app.prisma.transaction.update({
        where: { id },
        data: { status: "COMPLETED", paymentStatus: "DAMAGE_CAPTURED" },
        include: txInclude,
      }),
      app.prisma.user.update({ where: { id: tx.ownerId }, data: { walletCents: { increment: earnings } } }),
      app.prisma.closetItem.update({ where: { id: tx.itemId }, data: { status: "AVAILABLE" } }),
    ]);
    return updated;
  });

  // Rate the other party after a completed transaction. Two-sided: each
  // participant may leave one rating (enforced by the unique constraint).
  app.post("/transactions/:id/rating", async (req, reply) => {
    const me = requireUser(req);
    const { id } = req.params as { id: string };
    const parsed = rateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid rating", issues: parsed.error.flatten() });
    }

    const tx = await app.prisma.transaction.findUnique({ where: { id } });
    if (!tx) return reply.code(404).send({ error: "Transaction not found" });
    if (tx.ownerId !== me && tx.counterpartyId !== me) {
      return reply.code(403).send({ error: "Not your transaction" });
    }
    if (tx.status !== "COMPLETED") {
      return reply.code(409).send({ error: "You can only rate a completed transaction" });
    }

    const rateeId = tx.ownerId === me ? tx.counterpartyId : tx.ownerId;
    const existing = await app.prisma.rating.findUnique({
      where: { transactionId_raterId: { transactionId: id, raterId: me } },
    });
    if (existing) return reply.code(409).send({ error: "You already rated this" });

    return app.prisma.rating.create({
      data: { transactionId: id, raterId: me, rateeId, ...parsed.data },
    });
  });

  // Advance a transaction through its lifecycle. The lifecycle (who may act,
  // and from which status) is enforced here, not on the client. Creator-layer
  // money settles on accept (payment required) and return (payout + refund).
  app.post("/transactions/:id/:action", async (req, reply) => {
    const me = requireUser(req);
    const { id, action } = req.params as { id: string; action: string };
    const parsedAction = txActionSchema.safeParse(action);
    if (!parsedAction.success) return reply.code(400).send({ error: "Unknown action" });

    const tx = await app.prisma.transaction.findUnique({ where: { id } });
    if (!tx) return reply.code(404).send({ error: "Transaction not found" });

    const isOwner = tx.ownerId === me;
    const isCounterparty = tx.counterpartyId === me;
    if (!isOwner && !isCounterparty) return reply.code(403).send({ error: "Not your transaction" });

    // Lifecycle differs by kind: RENT loans the item out and back
    // (pickup → return); BUY/GIVEAWAY transfer ownership once (handoff).
    const soldStatus = tx.kind === "BUY" ? "SOLD" : "GIVEN";
    const rules: Record<
      TxAction,
      { who: "owner" | "either"; from: string[]; to: string; kinds: string[]; itemStatus?: string }
    > = {
      accept: { who: "owner", from: ["REQUESTED"], to: "ACCEPTED", kinds: ["RENT", "BUY", "GIVEAWAY"] },
      decline: { who: "owner", from: ["REQUESTED"], to: "DECLINED", kinds: ["RENT", "BUY", "GIVEAWAY"] },
      cancel: { who: "either", from: ["REQUESTED", "ACCEPTED"], to: "CANCELLED", kinds: ["RENT", "BUY", "GIVEAWAY"] },
      pickup: { who: "owner", from: ["ACCEPTED"], to: "ACTIVE", kinds: ["RENT"], itemStatus: "RENTED" },
      return: { who: "owner", from: ["ACTIVE"], to: "COMPLETED", kinds: ["RENT"], itemStatus: "AVAILABLE" },
      handoff: { who: "owner", from: ["ACCEPTED"], to: "COMPLETED", kinds: ["BUY", "GIVEAWAY"], itemStatus: soldStatus },
    };

    const rule = rules[parsedAction.data];
    if (!rule.kinds.includes(tx.kind)) {
      return reply.code(400).send({ error: `${parsedAction.data} doesn't apply to a ${tx.kind}` });
    }
    if (rule.who === "owner" && !isOwner) {
      return reply.code(403).send({ error: "Only the owner can do that" });
    }
    if (!rule.from.includes(tx.status)) {
      return reply.code(409).send({ error: `Can't ${parsedAction.data} from ${tx.status}` });
    }

    // Anything with a price needs paying before handover (friend-layer rentals
    // are free, so this is a no-op for them).
    const isPaid = (tx.priceCents ?? 0) > 0;
    const txData: { status: string; paymentStatus?: string } = { status: rule.to };

    if (parsedAction.data === "accept" && isPaid) {
      txData.paymentStatus = "REQUIRES_PAYMENT";
    }
    if ((parsedAction.data === "pickup" || parsedAction.data === "handoff") && isPaid && tx.paymentStatus !== "PAID") {
      return reply.code(402).send({ error: "Payment required before handoff" });
    }

    const ops: Array<ReturnType<typeof app.prisma.transaction.update>> = [];

    const completes = parsedAction.data === "return" || parsedAction.data === "handoff";
    const settles = completes && isPaid;

    // Owner update bundles money settlement + reward points in one write.
    const ownerData: { walletCents?: { increment: number }; points?: { increment: number } } = {};
    if (settles) {
      const earnings = (tx.priceCents ?? 0) - tx.platformFeeCents; // price − platform fee
      ownerData.walletCents = { increment: earnings };
      if (tx.stripePaymentIntentId) {
        await payments.capture(tx.stripePaymentIntentId);
        // Rentals refund the held deposit; sales have none.
        if (parsedAction.data === "return") await payments.refund(tx.stripePaymentIntentId, tx.depositCents);
      }
      // A returned rental refunds the deposit (REFUNDED); a completed sale stays PAID.
      if (parsedAction.data === "return") txData.paymentStatus = "REFUNDED";
    }
    if (completes) {
      // Reward both sides for a completed transaction (perks/discounts later).
      ownerData.points = { increment: 10 };
      ops.push(
        app.prisma.user.update({
          where: { id: tx.counterpartyId },
          data: { points: { increment: 10 } },
        }) as never,
      );
    }
    if (Object.keys(ownerData).length > 0) {
      ops.push(app.prisma.user.update({ where: { id: tx.ownerId }, data: ownerData }) as never);
    }

    const updateTx = app.prisma.transaction.update({
      where: { id },
      data: txData as never,
      include: txInclude,
    });
    const itemOp = rule.itemStatus
      ? app.prisma.closetItem.update({
          where: { id: tx.itemId },
          data: { status: rule.itemStatus as never },
        })
      : null;

    const results = await app.prisma.$transaction([
      updateTx,
      ...ops,
      ...(itemOp ? [itemOp] : []),
    ]);
    return results[0];
  });
}
