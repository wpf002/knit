import type { FastifyInstance } from "fastify";
import { updateProfileSchema } from "@knit/shared";
import { requireUser } from "../lib/auth.js";

const publicUser = {
  id: true,
  handle: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  isCreator: true,
  points: true,
  heightCm: true,
  usualSize: true,
} as const;

// Average + count of ratings received, for trust display.
async function ratingStats(app: FastifyInstance, userId: string) {
  const agg = await app.prisma.rating.aggregate({
    where: { rateeId: userId },
    _avg: { stars: true },
    _count: true,
  });
  return { ratingAvg: agg._avg.stars, ratingCount: agg._count };
}

export default async function userRoutes(app: FastifyInstance) {
  // The current user (resolved from the stubbed x-user-id header) + their
  // trust/reward stats.
  app.get("/me", async (req, reply) => {
    const id = requireUser(req);
    const user = await app.prisma.user.findUnique({ where: { id }, select: publicUser });
    if (!user) return reply.code(404).send({ error: "User not found" });
    return { ...user, ...(await ratingStats(app, id)) };
  });

  // Edit your fit profile (the "size twins" inputs).
  app.patch("/me", async (req, reply) => {
    const id = requireUser(req);
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid profile", issues: parsed.error.flatten() });
    }
    const user = await app.prisma.user.update({ where: { id }, data: parsed.data, select: publicUser });
    return { ...user, ...(await ratingStats(app, id)) };
  });

  // A public profile by handle, with rating stats.
  app.get("/users/:handle", async (req, reply) => {
    const { handle } = req.params as { handle: string };
    const user = await app.prisma.user.findUnique({ where: { handle }, select: publicUser });
    if (!user) return reply.code(404).send({ error: "User not found" });
    return { ...user, ...(await ratingStats(app, user.id)) };
  });

  // DEV ONLY: list users so the web app can offer a "logged in as" identity
  // switcher while real auth is stubbed. Remove when sessions land.
  app.get("/dev/users", async () => {
    return app.prisma.user.findMany({ select: publicUser, orderBy: { createdAt: "asc" } });
  });
}
