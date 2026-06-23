import { env } from "./env.js";

// Payments boundary. The rest of the app talks to this interface and never to
// Stripe directly, so swapping the simulated provider for the real Stripe SDK
// is a single-file change.
//
// Money is always integer cents. A creator-layer rental authorizes
// (rent + deposit); on a clean return we capture the rent (minus platform fee,
// paid out to the creator's Connect account) and refund the deposit. On damage
// we capture part/all of the deposit instead.
export interface AuthorizeArgs {
  rentCents: number;
  depositCents: number;
  feeCents: number;
  connectedAccountId: string | null;
}

export interface Authorization {
  paymentIntentId: string;
  clientSecret: string;
}

export interface PaymentsProvider {
  readonly mode: "live" | "simulated";
  createConnectAccount(userId: string): Promise<{ accountId: string }>;
  onboardingLink(accountId: string, returnUrl: string): Promise<{ url: string }>;
  accountReady(accountId: string): Promise<boolean>;
  authorizeRental(args: AuthorizeArgs): Promise<Authorization>;
  capture(paymentIntentId: string): Promise<void>;
  refund(paymentIntentId: string, amountCents: number): Promise<void>;
}

function rid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

// Simulated provider — no network, no keys. Fabricates Stripe-shaped ids and
// always reports onboarding as complete so the full flow is demoable. Swap for
// a real Stripe implementation behind the same interface when keys land.
const simulated: PaymentsProvider = {
  mode: "simulated",
  async createConnectAccount() {
    return { accountId: rid("acct_sim") };
  },
  async onboardingLink(accountId, returnUrl) {
    // In live mode this is a Stripe-hosted URL; here we bounce straight back
    // with a flag the web app treats as "onboarding complete".
    return { url: `${returnUrl}?connect=done&acct=${accountId}` };
  },
  async accountReady() {
    return true;
  },
  async authorizeRental() {
    const id = rid("pi_sim");
    return { paymentIntentId: id, clientSecret: `${id}_secret_${rid("cs")}` };
  },
  async capture() {
    /* no-op in simulation */
  },
  async refund() {
    /* no-op in simulation */
  },
};

// TODO(live): when env.STRIPE_SECRET_KEY is set, construct a Stripe-backed
// PaymentsProvider here (Connect accounts/account links, PaymentIntents with
// application_fee_amount + transfer_data.destination, capture, refunds) and
// return it instead. Until then we simulate so nothing blocks on keys.
export const payments: PaymentsProvider = simulated;

export const platformFeeCents = (rentCents: number): number =>
  Math.round((rentCents * env.PLATFORM_FEE_BPS) / 10_000);
