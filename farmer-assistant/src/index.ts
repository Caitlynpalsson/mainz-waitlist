import { handleApi, type Env } from "./api.ts";
import { runScheduled } from "./schedule.ts";

export type { Env };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(): Promise<void> {
    await runScheduled();
  },
};
