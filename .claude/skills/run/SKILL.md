---
name: run
description: Launch and drive the Knit app locally — Postgres (Docker) + Fastify API + Next.js web. Use when asked to run, start, or screenshot the Knit app, or to confirm a change works in the real app.
---

# Run Knit

Knit is a pnpm/Turborepo monorepo: **`@knit/web`** (Next.js 15, phone-first PWA),
**`@knit/api`** (Fastify 5), **`@knit/db`** (Prisma + Postgres), plus `@knit/shared`
(zod). Running it means: Postgres up → schema pushed + seeded → API on :4000 →
web on :3000 → drive a real page.

## Gotchas this skill exists to capture

1. **No local Postgres; use Docker.** There's no `psql`/`pg_ctl` on PATH. Docker is.
2. **Env loading.** The root `db:*` and `dev` scripts are wrapped with `dotenv-cli`
   (`dotenv -e .env --`), so `pnpm db:push` / `db:seed` / `dev` load the root `.env`
   automatically — no inline `DATABASE_URL` needed. Only if you bypass them and call
   Prisma directly (`pnpm --filter @knit/db exec prisma ...`, cwd `packages/db`) must you
   export `DATABASE_URL` inline, since Prisma there won't find the root `.env`.
3. **Ports collide on shared machines.** This box already had other apps on **3000** and
   **5432**. Pick free ports and thread them through. The commands below auto-pick.
4. **next/font fetches Google Fonts at build/dev** (Fraunces + Inter) — needs network on
   first run.

## 0. Prerequisites (once)

```bash
pnpm install
pnpm --filter @knit/db exec prisma generate
```

## 1. Postgres (Docker)

Pick a free host port (prefers 5432, falls back upward) and start a container:

```bash
PGPORT=5432; for p in 5432 5433 5436 5437; do \
  if ! (docker ps --format '{{.Ports}}' | grep -q ":$p->") && ! lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; \
  then PGPORT=$p; break; fi; done; echo "using PGPORT=$PGPORT"
docker rm -f knit-pg >/dev/null 2>&1
docker run -d --name knit-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=knit -p $PGPORT:5432 postgres:16
for i in $(seq 1 30); do docker exec knit-pg pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:$PGPORT/knit?schema=public"
```

Keep the `DATABASE_URL` it prints — every step below needs it.

## 2. Env + schema + seed

```bash
[ -f .env ] || cp .env.example .env
# Edit the DATABASE_URL line in .env to match $PGPORT from step 1.
pnpm db:push   # loads root .env via dotenv-cli; creates tables (re-run after schema changes)
pnpm db:seed   # 3 users (maya/jess/ana), 6 items across all visibility tiers
```

## 3. Servers

The simplest path — `pnpm dev` is wrapped with `dotenv-cli`, so it loads the root `.env`
and runs web + api together via Turborepo:

```bash
pnpm dev   # api :4000, web :3000
```

If **port 3000 or 4000 is taken**, run the apps separately so you can override ports.
The web `dev` script hardcodes `-p 3000`, so bypass it with `exec`; the API reads
`DATABASE_URL` from the environment, so export it inline here (you're not going through
the wrapped root script):

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:$PGPORT/knit?schema=public"
pnpm --filter @knit/api dev                      # :4000 — run_in_background, log /tmp/knit-api.log
pnpm --filter @knit/web exec next dev -p 3100    # :3100 — run_in_background, log /tmp/knit-web.log
```

If using the Claude Preview tool, `.claude/launch.json` already defines a `web` config on
**3100** — call `preview_start` with name `web` (free port 3100 first; the preview tool
refuses to attach to a non-preview server already on that port).

## 4. Smoke test (prove it's alive)

```bash
curl -s http://localhost:4000/health                       # {"status":"ok",...}
JESS=$(curl -s http://localhost:4000/dev/users | python3 -c "import sys,json;print(next(u['id'] for u in json.load(sys.stdin) if u['handle']=='jess'))")
curl -s -H "x-user-id: $JESS" http://localhost:4000/feed/circle    # Maya's CIRCLE items
curl -s -H "x-user-id: $JESS" http://localhost:4000/feed/discover  # followed creators + public
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/    # 200
```

## 5. Drive the UI (don't just launch it)

Auth is stubbed: identity = the `x-user-id` header, sourced client-side from
`localStorage["knit:uid"]`. To view as a seeded user before screenshotting `/feed`,
`/closet`, etc., set it in the page first (preview_eval or browser console):

```js
(async () => {
  const u = await (await fetch('http://localhost:4000/dev/users')).json();
  localStorage.setItem('knit:uid', u.find(x => x.handle === 'jess').id);
  location.href = '/feed';
})()
```

Then screenshot. A populated `/feed` (circle + discover sections with item cards) is the
proof it works. The in-app **"Viewing as"** dropdown switches identity thereafter.

Key routes: `/` (landing) · `/feed` · `/closet` + `/closet/new` · `/borrows` ·
`/rent/[id]` `/borrow/[id]` `/acquire/[id]?kind=BUY|GIVEAWAY` · `/checkout/[id]` ·
`/rate/[id]` · `/wallet` · `/plus` · `/stylist`.

## Notes

- **Payments, Plus billing, and the AI stylist are simulated** (no live Stripe/Anthropic
  keys needed). Setting `STRIPE_SECRET_KEY` / `ANTHROPIC_API_KEY` is the live-swap point
  (`apps/api/src/lib/stripe.ts`, `apps/api/src/lib/stylist.ts`).
- **Teardown:** `docker rm -f knit-pg` and kill the two dev processes.
- After a `schema.prisma` change: `prisma generate` + `prisma db push` (+ re-seed).
