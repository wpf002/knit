import { z } from "zod";

// Mirror of the Prisma enums, kept here so the API and web validate against the
// same source of truth without importing the db package on the client.
export const Visibility = z.enum(["CIRCLE", "FOLLOWER", "PUBLIC"]);
export const TransactionKind = z.enum(["RENT", "BUY", "GIVEAWAY"]);
export const TransactionLayer = z.enum(["FRIEND", "CREATOR"]);

// --- Closet items ---------------------------------------------------------
// Base shape, reused for create (with an "at least one action" guard) and for
// update (all fields optional — PATCH semantics).
export const itemFields = z.object({
  title: z.string().min(1).max(120),
  brand: z.string().max(80).optional(),
  category: z.string().max(60).optional(),
  size: z.string().max(40).optional(),
  fit: z.string().max(40).optional(),
  material: z.string().max(60).optional(),
  color: z.string().max(40).optional(),
  photos: z.array(z.string().url()).max(8).default([]),
  visibility: Visibility.default("CIRCLE"),
  rentable: z.boolean().default(true),
  buyable: z.boolean().default(false),
  giveable: z.boolean().default(false),
  rentDailyCents: z.number().int().nonnegative().nullable().optional(),
  buyCents: z.number().int().nonnegative().nullable().optional(),
  // Refundable security deposit for creator-layer (paid) rentals.
  depositCents: z.number().int().nonnegative().nullable().optional(),
});

export const createItemSchema = itemFields.refine(
  (v) => v.rentable || v.buyable || v.giveable,
  { message: "An item must be rentable, buyable, or giveable." },
);
export type CreateItemInput = z.infer<typeof createItemSchema>;

// PATCH: every field optional; the "at least one action" guard only applies if
// the caller is touching the action flags at all.
export const updateItemSchema = itemFields.partial().refine(
  (v) =>
    v.rentable === undefined && v.buyable === undefined && v.giveable === undefined
      ? true
      : Boolean(v.rentable || v.buyable || v.giveable),
  { message: "An item must be rentable, buyable, or giveable." },
);
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

// --- Transactions ---------------------------------------------------------
// One request type covers rent/buy/giveaway. The server decides the LAYER
// (and therefore whether money applies) from the relationship between users.
export const createTransactionSchema = z
  .object({
    itemId: z.string().cuid(),
    kind: TransactionKind,
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine((v) => v.kind !== "RENT" || (v.startDate && v.endDate), {
    message: "Rentals require a startDate and endDate.",
  })
  .refine((v) => !(v.startDate && v.endDate) || v.endDate > v.startDate, {
    message: "endDate must be after startDate.",
  });
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// Status-transition actions. The server enforces who may do what and from which
// status (the lifecycle lives in the API, not the client).
//   accept/decline — owner responds to a request
//   cancel         — either party backs out before handoff
//   pickup         — owner confirms the item changed hands (→ ACTIVE)
//   return         — owner confirms it came back (→ COMPLETED)
export const txActionSchema = z.enum([
  "accept",
  "decline",
  "cancel",
  "pickup", // RENT: item handed over (→ ACTIVE)
  "return", // RENT: item came back (→ COMPLETED)
  "handoff", // BUY/GIVEAWAY: ownership transferred (→ COMPLETED, item SOLD/GIVEN)
]);
export type TxAction = z.infer<typeof txActionSchema>;

// Checkout for a paid (creator-layer) rental. useWallet pays from the in-app
// circular balance instead of a card when it covers the total.
export const checkoutSchema = z.object({ useWallet: z.boolean().default(false) });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// Owner reports damage on return, capturing part/all of the held deposit.
export const reportDamageSchema = z.object({
  amountCents: z.number().int().positive(),
  note: z.string().max(500).optional(),
});
export type ReportDamageInput = z.infer<typeof reportDamageSchema>;

// --- Ratings --------------------------------------------------------------
export const createRatingSchema = z.object({
  transactionId: z.string().cuid(),
  stars: z.number().int().min(1).max(5),
  care: z.number().int().min(1).max(5).optional(),
  timeliness: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
});
export type CreateRatingInput = z.infer<typeof createRatingSchema>;

// Rating body when the transaction id comes from the route path.
export const rateBodySchema = createRatingSchema.omit({ transactionId: true });
export type RateBodyInput = z.infer<typeof rateBodySchema>;

// Fit profile (the "size twins" inputs). Both optional/nullable.
export const updateProfileSchema = z.object({
  heightCm: z.number().int().positive().max(260).nullable().optional(),
  usualSize: z.string().max(20).nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// --- AI stylist (Plus) -----------------------------------------------------
// Ask the assistant to style you for an occasion from your network's inventory.
export const stylistSchema = z.object({ occasion: z.string().min(1).max(120) });
export type StylistInput = z.infer<typeof stylistSchema>;
