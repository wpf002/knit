import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),

  // Payments. Optional: when STRIPE_SECRET_KEY is absent the app runs a
  // simulated payments provider (see lib/stripe.ts) so the paid-rent flow is
  // exercisable end to end without live keys.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Platform take rate on creator-layer rentals, in basis points (1500 = 15%).
  PLATFORM_FEE_BPS: z.coerce.number().default(1500),
  // Where Stripe Connect onboarding returns to.
  WEB_URL: z.string().default("http://localhost:3000"),

  // AI stylist. Optional: without it the stylist uses a deterministic
  // recommender over the user's network inventory (see lib/stylist.ts).
  ANTHROPIC_API_KEY: z.string().optional(),
});

export const env = schema.parse(process.env);
