# Drobe

A social closet network. See what's in your **friends'** closets and your **favorite creators'** closets, and rent, buy, or give away the actual pieces. Stitch Fix / Nuuly give you access to a company's inventory; Drobe gives you access to real people's inventory, with a social feed around it.

> Codename. Rename freely — it appears in `package.json` names (`@drobe/*`), the Prisma seed, and the web copy.

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
drobe/
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

The schema supports the whole roadmap; build in this sequence so each step validates before the next:

1. **Closet object + onboarding** that feels like posting (not data entry) — the keystone risk.
2. **Circle feed + Discover feed** — browse and save, no transactions.
3. **Free borrow (friend layer)** — confirm people request and lend.
4. **Paid rent (creator layer)** — Stripe Connect, deposits, damage policy.
5. **Buy + give away.**
6. **Ratings + rewards.**
7. **AI assistant** — only once there's enough inventory to be useful.

## Deploy (Railway)

Provision a Postgres plugin (sets `DATABASE_URL`), then two services from this repo:

- **api** — root `apps/api`, build `pnpm install && pnpm --filter @drobe/db generate && pnpm --filter @drobe/api build`, start `pnpm --filter @drobe/api start`.
- **web** — root `apps/web`, build `pnpm install && pnpm --filter @drobe/web build`, start `pnpm --filter @drobe/web start`. Set `NEXT_PUBLIC_API_URL` to the api service URL.

Run `pnpm db:migrate deploy` (or `db:push`) against the Railway database before first boot.
