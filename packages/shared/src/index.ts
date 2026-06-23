import { z } from "zod";

// Mirror of the Prisma enums, kept here so the API and web validate against the
// same source of truth without importing the db package on the client.
export const Visibility = z.enum(["CIRCLE", "FOLLOWER", "PUBLIC"]);
export const TransactionKind = z.enum(["RENT", "BUY", "GIVEAWAY"]);
export const TransactionLayer = z.enum(["FRIEND", "CREATOR"]);

// --- Closet items ---------------------------------------------------------
export const createItemSchema = z
  .object({
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
  })
  .refine((v) => v.rentable || v.buyable || v.giveable, {
    message: "An item must be rentable, buyable, or giveable.",
  });
export type CreateItemInput = z.infer<typeof createItemSchema>;

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

// --- Ratings --------------------------------------------------------------
export const createRatingSchema = z.object({
  transactionId: z.string().cuid(),
  stars: z.number().int().min(1).max(5),
  care: z.number().int().min(1).max(5).optional(),
  timeliness: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
});
export type CreateRatingInput = z.infer<typeof createRatingSchema>;
