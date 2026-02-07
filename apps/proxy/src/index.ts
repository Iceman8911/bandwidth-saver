import { getProxyEnv } from "@bandwidth-saver/shared";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { healthRoute } from "./modules/health";
import { processImageRoute } from "./modules/process-image";

const env = getProxyEnv();

const IS_HOSTED_ON_CLOUDFLARE = env.DEPLOYMENT_PLATFORM === "cloudflare";

const app = new Elysia({
	adapter: IS_HOSTED_ON_CLOUDFLARE ? CloudflareAdapter : undefined,
})
	.use(healthRoute)
	.use(processImageRoute);

if (IS_HOSTED_ON_CLOUDFLARE) {
	app.compile();
}

if (env.DEPLOYMENT_PLATFORM === "server") {
	app.listen(
		{
			hostname: env.VITE_SERVER_HOST,
			port: env.VITE_SERVER_PORT,
		},
		(server) => {
			console.log(
				`Elysia server running at http://${server.hostname}:${server.port}`,
			);
		},
	);
}

export type ElysiaApp = typeof app;

const defaultExport = IS_HOSTED_ON_CLOUDFLARE
	? {
			fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
				return app.decorate({ ctx, env }).handle(request);
			},
		}
	: app;

export default defaultExport;
