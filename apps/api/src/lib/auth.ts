import type { FastifyRequest } from "fastify";

// NOTE: auth is stubbed. Until real sessions land, identity comes from an
// x-user-id header so the routes are exercisable end to end. Replace before any
// real data goes in. Centralized here so every route resolves identity the same
// way (and there's a single place to swap in real auth).
export function requireUser(req: FastifyRequest): string {
  const id = req.headers["x-user-id"];
  if (typeof id !== "string" || !id) {
    throw Object.assign(new Error("Missing x-user-id (auth not wired yet)"), {
      statusCode: 401,
    });
  }
  return id;
}
