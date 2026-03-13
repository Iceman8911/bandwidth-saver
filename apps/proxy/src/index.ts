import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { healthRoute } from "./modules/health";
import { processImageRoute } from "./modules/process-image";

const env = process.env;

const IS_HOSTED_ON_CLOUDFLARE = env.DEPLOYMENT_PLATFORM === "cloudflare";

const baseApp = new Elysia({
	adapter: IS_HOSTED_ON_CLOUDFLARE ? CloudflareAdapter : undefined,
})
	.use(healthRoute)
	.use(processImageRoute);

if (IS_HOSTED_ON_CLOUDFLARE) {
	baseApp.compile();
}

if (env.DEPLOYMENT_PLATFORM === "deno") {
	//@ts-expect-error deno will be available
	Deno.serve(baseApp.fetch);
}

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

export type ElysiaApp = typeof baseApp;

export default baseApp;
