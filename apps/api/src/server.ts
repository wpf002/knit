import { buildApp } from "./app.js";
import { env } from "./lib/env.js";

const app = await buildApp();

app
  .listen({ port: env.API_PORT, host: "0.0.0.0" })
  .then(() => app.log.info(`drobe-api listening on :${env.API_PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
