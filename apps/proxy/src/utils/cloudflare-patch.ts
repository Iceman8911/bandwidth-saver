import Elysia from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

export type AugumentWithCloudflareContextAndEnv<TContext> = TContext & {
	env: Env;
	ctx: ExecutionContext;
};
