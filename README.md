# Knit

A social closet network. See what's in your **friends'** closets and your **favorite creators'** closets, and rent, buy, or give away the actual pieces. Stitch Fix / Nuuly give you access to a company's inventory; Knit gives you access to real people's inventory, with a social feed around it.

> **Name:** "Knit" (renamed from the original "Drobe" codename, which collided with an existing UK app). Chosen for the double meaning — a *close-knit* circle (the friend cluster the network bootstraps from) and *knit* as textile. Final clearance still pending: run a trademark check (apparel + software classes, US/UK), domain, and App Store / Play Store name search before any public launch. The name appears in `package.json` names (`@knit/*`), the Prisma seed, and the web copy.

## The one idea to keep in your head

The product is **one app with two layers**, and that distinction is enforced all the way down to the database:

| | **Friend layer** | **Creator layer** |
|---|---|---|
| Graph | mutual `Friendship` | one-way `Follow` |
| Visibility | `CIRCLE` | `FOLLOWER` / `PUBLIC` |
| Rentals | **free** | **paid** |
| Job | retention, daily browsing | acquisition, aspiration, revenue |
| Trust | free (real relationships) | earned (ratings, deposits) |

Friends carry retention; creators carry growth. Don't blur them. If a feature looks like Pickle's homepage, it isn't the differentiator — lean into the social side they can't follow.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Web:** Next.js 15 (App Router, PWA — phone-first)
- **API:** Fastify 5 (TypeScript, ESM)
- **DB:** Prisma + Postgres
- **Validation:** zod (shared between web + API)
- **Deploy:** Railway

## Layout

```
knit/
├── apps/
│   ├── web/          Next.js 15 PWA — the social closet
│   └── api/          Fastify API (health, items, transactions)
├── packages/
│   ├── db/           Prisma schema (the concept, concretely) + client + seed
│   ├── shared/       zod schemas + types shared by web and API
│   └── config/       shared Prettier (ESLint flat config to follow)
├── bootstrap.sh      one-time local setup
├── turbo.json        task graph
└── .env.example      copy to .env
```

## Quickstart

```bash
pnpm install          # or: ./bootstrap.sh (does install + env + prisma generate)
cp .env.example .env  # set DATABASE_URL
pnpm db:push          # create tables
pnpm db:seed          # 2 users, a circle, a friendship, a follow, 2 items
pnpm dev              # web :3000, api :4000
```

Auth is intentionally stubbed (an `x-user-id` header stands in for a session) so the routes are exercisable before login lands:

```bash
curl -H "x-user-id: <SEEDED_USER_ID>" http://localhost:4000/items
```

## Scripts (root)

| Command | Does |
|---|---|
| `pnpm dev` | run web + api in parallel |
| `pnpm build` | build all packages |
| `pnpm typecheck` | typecheck the workspace |
| `pnpm db:push` / `db:migrate` | schema to database |
| `pnpm db:seed` | seed sample data |
| `pnpm db:studio` | Prisma Studio |

## Build order

The schema supports the whole roadmap; build each phase **end-to-end** (db → `@knit/shared` → `@knit/api` → `@knit/web`) before the next, so each step validates before the one after it:

1. **Closet object + onboarding** that feels like posting (not data entry) — the keystone risk.
2. **Circle feed + Discover feed** — browse and save, no transactions.
3. **Free borrow (friend layer)** — confirm people request and lend.
4. **Paid rent (creator layer)** — Stripe Connect, deposits, damage policy.
5. **Buy + give away.**
6. **Ratings + rewards.**
7. **AI assistant** — only once there's enough inventory to be useful.

## The edge (what competitors structurally can't copy)

Researched against Pickle, By Rotation, Depop, HURR, The Volte, Hire Street, RTR, Armoire, Nuuly. The rental/subscription incumbents have polished mechanics but **no social graph**; the social-resale players have a graph but weak commerce. Knit's wedge is that *fit, trust, and discovery all get easier the more social you are* — so these features compound the moat. Each is tagged to the phase it lands in:

- **Listing flow = feed-content engine** *(Phase 1→2)* — nudge worn-on-body photos at listing time; auto-generate a feed post when a loan completes. Solves cold-start feed content as a byproduct of listing.
- **Circle FOMO + notify-on-drop** *(Phase 2)* — "3 new pieces in your circle's closets this week." Leans on the `Circle` model; tight-group exclusivity a public marketplace can't manufacture.
- **Reverse request — "I need an outfit" → ask your circle** *(Phase 2/3)* — post "black-tie, size 8, this Saturday" and let friends/creators offer pieces. Demand→supply, where everyone else is supply→demand.
- **Local free handoff = a cost moat** *(Phase 3)* — friends are physically close; in-person handoff is free, same-day, social. Structural advantage over shipping-bound competitors.
- **Friend-fit notes / "size twins"** *(Phase 6, hook in Phase 2)* — show how a piece fit *the friend whose body you know*, plus a "find friends my size" filter. Beats RTR's stranger fit-notes.
- **Circular wallet / borrow-back credit** *(Phase 4)* — lending earnings fund your own renting; a lightweight favor-reciprocity on the friend layer.
- **AI stylist over your network's real inventory** *(Phase 7, $10 Plus tier)* — "for the wedding, borrow Ana's green dress + Jo's clutch — both free, both your size, both available." Styles you from people you know, not a faceless catalog. The clearest justification for Plus.

Supporting trust mechanics to adopt wholesale: double-blind two-sided reviews + "Top Lender" badges (HURR), suggested price + "recoup cost in N loans" projection at listing, retail-price anchoring on every card, and **"Available Now" as a first-class card state** (mandatory for single-unit inventory).

Anti-patterns to design around: thin inventory kills the feed (concentrate launch geography — the close-knit cluster does this); don't let the social feed bury the shop path (Depop's flaw); mobile performance is a feature (PWA); mandate a full-look photo + detail shots (over-zoomed photos hurt fit perception).

## Brand

Tokens live in `apps/web/app/globals.css` and are intentional — **don't drift to the cream + terracotta + serif default.**

| Token | Value | Role |
|---|---|---|
| `--paper` | `#fbf6f2` | warm background |
| `--ink` | `#2a2230` | deep aubergine text |
| `--raspberry` | `#d6336c` | accent — **creator** layer + brand mark |
| `--sage` | `#7e9b86` | secondary — **friend/circle** layer |

Display type **Fraunces**, body **Inter**. The logo is a **raspberry circular knot-monogram** (the knot = the "close-knit" + textile double meaning), at `apps/web/app/icon.svg`, used as the PWA app icon and favicon.

## Deploy (Railway)

Provision a Postgres plugin (sets `DATABASE_URL`), then two services from this repo:

- **api** — root `apps/api`, build `pnpm install && pnpm --filter @knit/db generate && pnpm --filter @knit/api build`, start `pnpm --filter @knit/api start`.
- **web** — root `apps/web`, build `pnpm install && pnpm --filter @knit/web build`, start `pnpm --filter @knit/web start`. Set `NEXT_PUBLIC_API_URL` to the api service URL.

Run `pnpm db:migrate deploy` (or `db:push`) against the Railway database before first boot.
