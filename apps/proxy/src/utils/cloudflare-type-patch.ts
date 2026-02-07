import { Context } from "elysia";

export type AugumentWithCloudflareContextAndEnv<TContext> = TContext & {
	env: Env;
	ctx: ExecutionContext;
};
