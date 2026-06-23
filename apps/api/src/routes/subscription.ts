import type { FastifyInstance } from "fastify";
import { requireUser } from "../lib/auth.js";

const THIRTY_DAYS_MS = 30 * 86_400_000;

// The $10 Plus tier. Justified by the social feed + AI stylist, NOT as a
// paywall on renting. Billing is simulated here (no real charge) — wire Stripe
// Billing in the same spot when keys land.
export default async function subscriptionRoutes(app: FastifyInstance) {
  app.get("/subscription", async (req) => {
    const me = requireUser(req);
    const sub = await app.prisma.subscription.findUnique({ where: { userId: me } });
    return sub ?? { tier: "FREE", status: "ACTIVE" };
  });

  app.post("/subscription/subscribe", async (req) => {
    const me = requireUser(req);
    // NOTE: simulated. A real flow creates a Stripe Customer + Subscription and
    // flips tier on the webhook. We set the period a month out directly.
    const periodEnd = new Date(Date.now() + THIRTY_DAYS_MS);
    return app.prisma.subscription.upsert({
      where: { userId: me },
      update: { tier: "PLUS", status: "ACTIVE", currentPeriodEnd: periodEnd },
      create: { userId: me, tier: "PLUS", status: "ACTIVE", currentPeriodEnd: periodEnd },
    });
  });

  app.post("/subscription/cancel", async (req, reply) => {
    const me = requireUser(req);
    const sub = await app.prisma.subscription.findUnique({ where: { userId: me } });
    if (!sub) return reply.code(404).send({ error: "No subscription" });
    return app.prisma.subscription.update({
      where: { userId: me },
      data: { tier: "FREE", status: "CANCELLED" },
    });
  });
}
