import {
	getCompressedImageUrlWithFallback,
	getProxyEnv,
	ImageCompressionPayloadSchema,
	REDIRECTED_SEARCH_PARAM_FLAG,
	ServerAPIEndpoint,
} from "@bandwidth-saver/shared";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { compressImagefromUrl } from "./compression";
import { cleanlyExtractUrlFromImageCompressorPayload } from "./url";

const env = getProxyEnv();

const IS_HOSTED_ON_CLOUDFLARE = env.DEPLOYMENT_PLATFORM === "cloudflare";

const app = new Elysia({
	adapter: IS_HOSTED_ON_CLOUDFLARE ? CloudflareAdapter : undefined,
})
	.get(`/${ServerAPIEndpoint.HEALTH}`, ({ status }) => status(200))
	.get(
		`/${ServerAPIEndpoint.COMPRESS_IMAGE}`,
		async (args) => {
			const { query, redirect } = args;

			const srcUrl = cleanlyExtractUrlFromImageCompressorPayload(query);

			/** Make a new trimmed request solely with the url for caching */
			let trimmedRequest: Request | undefined;
			/** The final response at the end of processing that I can cache and do some stuff */
			let processedResponse: Response;

			if (IS_HOSTED_ON_CLOUDFLARE) {
				trimmedRequest = new Request(srcUrl);

				const cachedResponse = await caches.default.match(trimmedRequest);

				if (cachedResponse) return cachedResponse;
			}

			// I'll make this cleaner later
			const possiblyRedirectedUrl = await getCompressedImageUrlWithFallback({
				...query,
				url_bwsvr8911: srcUrl,
			});

			if (possiblyRedirectedUrl !== query.url_bwsvr8911) {
				processedResponse = redirect(
					decodeURIComponent(
						`${possiblyRedirectedUrl}#${REDIRECTED_SEARCH_PARAM_FLAG}`,
					),
				);
			} else {
				try {
					// Compress the image ourselves
					const compressedResponse = await compressImagefromUrl({
						format: query.format_bwsvr8911,
						preserveAnim: query.preserveAnim_bwsvr8911,
						quality: query.quality_bwsvr8911,
						url: possiblyRedirectedUrl,
					});

					processedResponse = compressedResponse;
				} catch (e) {
					console.warn(
						"Why did compression throw:",
						e,
						"on the url:",
						possiblyRedirectedUrl,
					);

					// Default to the original url
					processedResponse = redirect(
						`${query.url_bwsvr8911}#${REDIRECTED_SEARCH_PARAM_FLAG}`,
					);
				}
			}

			if (IS_HOSTED_ON_CLOUDFLARE && trimmedRequest) {
				//@ts-expect-error `ctx` should exist in the worker's args if hosted on Cloudflare workers
				const ctx = args.ctx as ExecutionContext;

				const promise = caches.default.put(
					trimmedRequest,
					processedResponse.clone(),
				);

				// Optional access since, for some reason, this may be undefined :p
				ctx?.waitUntil(promise);
			}

			return processedResponse;
		},
		{
			query: ImageCompressionPayloadSchema,
		},
	);

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
