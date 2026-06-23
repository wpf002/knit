import type { FastifyInstance } from "fastify";
import { requireUser } from "../lib/auth.js";
import { payments } from "../lib/stripe.js";
import { env } from "../lib/env.js";

// Creator payouts (Stripe Connect) + the in-app circular wallet.
export default async function billingRoutes(app: FastifyInstance) {
  app.get("/wallet", async (req) => {
    const me = requireUser(req);
    const user = await app.prisma.user.findUnique({
      where: { id: me },
      select: { walletCents: true, stripeConnectId: true },
    });
    return {
      walletCents: user?.walletCents ?? 0,
      payoutsConnected: Boolean(user?.stripeConnectId),
    };
  });

  // Start (or resume) Stripe Connect onboarding so a creator can receive
  // payouts. Returns a URL the web app sends the user to.
  app.post("/connect/onboard", async (req) => {
    const me = requireUser(req);
    const user = await app.prisma.user.findUnique({
      where: { id: me },
      select: { stripeConnectId: true },
    });

    let accountId = user?.stripeConnectId ?? null;
    if (!accountId) {
      const created = await payments.createConnectAccount(me);
      accountId = created.accountId;
      await app.prisma.user.update({ where: { id: me }, data: { stripeConnectId: accountId } });
    }

    const link = await payments.onboardingLink(accountId, `${env.WEB_URL}/wallet`);
    return { url: link.url, mode: payments.mode };
  });

  app.get("/connect/status", async (req) => {
    const me = requireUser(req);
    const user = await app.prisma.user.findUnique({
      where: { id: me },
      select: { stripeConnectId: true },
    });
    const ready = user?.stripeConnectId ? await payments.accountReady(user.stripeConnectId) : false;
    return { connected: Boolean(user?.stripeConnectId), ready };
  });
}
