// Tiny client-side API helper. Talks to the Fastify API and injects the stubbed
// identity (x-user-id) from localStorage until real auth lands.
import type {
  CreateItemInput,
  CreateTransactionInput,
  TxAction,
  RateBodyInput,
  UpdateProfileInput,
} from "@knit/shared";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const UID_KEY = "knit:uid";

export type Visibility = "CIRCLE" | "FOLLOWER" | "PUBLIC";
export type ItemStatus = "AVAILABLE" | "RENTED" | "SOLD" | "GIVEN" | "ARCHIVED";

export interface DevUser {
  id: string;
  handle: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  isCreator: boolean;
  points?: number;
  heightCm?: number | null;
  usualSize?: string | null;
}

// /me and /users/:handle add rating stats on top of the user fields.
export interface Profile extends DevUser {
  points: number;
  ratingAvg: number | null;
  ratingCount: number;
}

export interface ClosetItem {
  id: string;
  title: string;
  brand?: string | null;
  category?: string | null;
  size?: string | null;
  fit?: string | null;
  material?: string | null;
  color?: string | null;
  photos: string[];
  visibility: Visibility;
  status: ItemStatus;
  rentable: boolean;
  buyable: boolean;
  giveable: boolean;
  rentDailyCents?: number | null;
  buyCents?: number | null;
  depositCents?: number | null;
  createdAt: string;
}

export function getUid(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(UID_KEY);
}

export function setUid(id: string): void {
  window.localStorage.setItem(UID_KEY, id);
}

// Auth is stubbed: identity comes from localStorage. On first visit nothing is
// set yet, which used to race the page's data fetches into a 401. ensureUid
// bootstraps to the first seeded user once (deduped) so every authenticated
// call always carries an x-user-id. The IdentityBar can still switch later.
let bootstrap: Promise<string | null> | null = null;
async function ensureUid(): Promise<string | null> {
  const existing = getUid();
  if (existing) return existing;
  if (typeof window === "undefined") return null;
  if (!bootstrap) {
    bootstrap = fetch(`${API_BASE}/dev/users`)
      .then((r) => (r.ok ? r.json() : []))
      .then((users: DevUser[]) => {
        const first = users[0];
        if (first) {
          setUid(first.id);
          return first.id;
        }
        return null;
      })
      .catch(() => null);
  }
  return bootstrap;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const uid = await ensureUid();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(uid ? { "x-user-id": uid } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status} ${res.statusText} ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface FeedOwner {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  isCreator: boolean;
  heightCm?: number | null;
  usualSize?: string | null;
}

// A feed item carries its owner (whose closet) and whether the viewer saved it.
export interface FeedItem extends ClosetItem {
  owner: FeedOwner;
  saved: boolean;
}

export const getDevUsers = () => api<DevUser[]>("/dev/users");
export const getMe = () => api<Profile>("/me");
export const updateProfile = (input: UpdateProfileInput) =>
  api<Profile>("/me", { method: "PATCH", body: JSON.stringify(input) });
export const getUserProfile = (handle: string) => api<Profile>(`/users/${handle}`);
export const rateTransaction = (id: string, body: RateBodyInput) =>
  api(`/transactions/${id}/rating`, { method: "POST", body: JSON.stringify(body) });
export const getCloset = () => api<ClosetItem[]>("/closet");
export const createItem = (input: CreateItemInput) =>
  api<ClosetItem>("/items", { method: "POST", body: JSON.stringify(input) });

export type TxStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "DECLINED"
  | "ACTIVE"
  | "RETURNED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export interface TxParty {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  isCreator: boolean;
}

export type PaymentStatus = "NONE" | "REQUIRES_PAYMENT" | "PAID" | "REFUNDED" | "DAMAGE_CAPTURED";

export interface Transaction {
  id: string;
  kind: "RENT" | "BUY" | "GIVEAWAY";
  layer: "FRIEND" | "CREATOR";
  status: TxStatus;
  priceCents?: number | null;
  platformFeeCents: number;
  depositCents: number;
  paymentStatus: PaymentStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  item: { id: string; title: string; photos: string[]; status: ItemStatus };
  owner: TxParty;
  counterparty: TxParty;
}

export interface CheckoutResult {
  paid: boolean;
  method: "wallet" | "card";
  totalCents: number;
  rentCents?: number;
  depositCents?: number;
  clientSecret?: string;
}

export interface WalletInfo {
  walletCents: number;
  payoutsConnected: boolean;
}

export type ItemWithOwner = ClosetItem & { owner: FeedOwner };

export const getItem = (id: string) => api<ItemWithOwner>(`/items/${id}`);
export const requestTransaction = (input: CreateTransactionInput) =>
  api<Transaction>("/transactions", { method: "POST", body: JSON.stringify(input) });
export const getTransaction = (id: string) => api<Transaction>(`/transactions/${id}`);
export const getIncoming = () => api<Transaction[]>("/transactions/incoming");
export const getOutgoing = () => api<Transaction[]>("/transactions/outgoing");
export const transitionTx = (id: string, action: TxAction) =>
  api<Transaction>(`/transactions/${id}/${action}`, { method: "POST" });

// Phase 4 — paid rent (creator layer)
export const checkout = (id: string, useWallet: boolean) =>
  api<CheckoutResult>(`/transactions/${id}/checkout`, {
    method: "POST",
    body: JSON.stringify({ useWallet }),
  });
export const confirmPayment = (id: string) =>
  api<Transaction>(`/transactions/${id}/confirm`, { method: "POST" });
export const reportDamage = (id: string, amountCents: number, note?: string) =>
  api<Transaction>(`/transactions/${id}/report-damage`, {
    method: "POST",
    body: JSON.stringify({ amountCents, note }),
  });

// Phase 7 — Plus subscription + AI stylist
export interface Subscription {
  tier: "FREE" | "PLUS";
  status: string;
  currentPeriodEnd?: string | null;
}
export type StylistPick = ItemWithOwner & { reason: string };

export const getSubscription = () => api<Subscription>("/subscription");
export const subscribePlus = () => api<Subscription>("/subscription/subscribe", { method: "POST" });
export const cancelPlus = () => api<Subscription>("/subscription/cancel", { method: "POST" });
export const getStylist = (occasion: string) =>
  api<StylistPick[]>("/stylist", { method: "POST", body: JSON.stringify({ occasion }) });

export const getWallet = () => api<WalletInfo>("/wallet");
export const connectOnboard = () =>
  api<{ url: string; mode: string }>("/connect/onboard", { method: "POST" });
export const getConnectStatus = () =>
  api<{ connected: boolean; ready: boolean }>("/connect/status");

export const getCircleFeed = () => api<FeedItem[]>("/feed/circle");
export const getDiscoverFeed = () => api<FeedItem[]>("/feed/discover");
export const getSaved = () => api<FeedItem[]>("/saved");
export const saveItem = (id: string) =>
  api<{ saved: boolean }>(`/items/${id}/save`, { method: "POST" });
export const unsaveItem = (id: string) => api<void>(`/items/${id}/save`, { method: "DELETE" });
