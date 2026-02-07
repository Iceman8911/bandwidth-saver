import { getProxyEnv } from "@bandwidth-saver/shared";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { healthRoute } from "./modules/health";
import { processImageRoute } from "./modules/process-image";

const env = getProxyEnv();

const IS_HOSTED_ON_CLOUDFLARE = env.DEPLOYMENT_PLATFORM === "cloudflare";

const baseApp = new Elysia().use(healthRoute).use(processImageRoute);

if (env.DEPLOYMENT_PLATFORM === "server") {
	baseApp.listen(
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

const defaultExport = IS_HOSTED_ON_CLOUDFLARE
	? {
			fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
				// Can't compile() or enable aot until elysia adds an intuitive way to access cloudflrae worker ctx
				return new Elysia({
					adapter: CloudflareAdapter,
					aot: false,
				})
					.use(baseApp)
					.decorate({ ctx, env })
					.handle(request);
			},
		}
	: baseApp;

export type ElysiaApp = typeof baseApp;
export default defaultExport;
