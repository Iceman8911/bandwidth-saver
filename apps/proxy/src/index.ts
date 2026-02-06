import {
	getCompressedImageUrlWithFallback,
	getProxyEnv,
	HtmlOptimizationPayloadSchema,
	ImageCompressionPayloadSchema,
	ProxyCustomHeaders,
	REDIRECTED_SEARCH_PARAM_FLAG,
	ServerAPIEndpoint,
	SPOOFING_FETCH_HEADERS,
	UrlSchema,
} from "@bandwidth-saver/shared";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { compressImagefromUrl } from "./compression";
import {
	fetchHtmlText,
	minifyHtmlString,
	stripOutCspMetaTagsFromHtmlString,
} from "./html-optimization";
import { cleanlyExtractNestedUrlFromRawRequestUrl } from "./url";

const env = getProxyEnv();

const IS_HOSTED_ON_CLOUDFLARE = env.DEPLOYMENT_PLATFORM === "cloudflare";

const app = new Elysia({
	adapter: IS_HOSTED_ON_CLOUDFLARE ? CloudflareAdapter : undefined,
})
	.get(`/${ServerAPIEndpoint.HEALTH}`, ({ status }) => status(200))
	.get(
		`/${ServerAPIEndpoint.PROCESS_HTML}`,
		async ({ query, request: { url: rawRequestUrl } }) => {
			const cleanedSrcUrl =
				cleanlyExtractNestedUrlFromRawRequestUrl(rawRequestUrl);

			/** Make a normalized request solely with the url for caching, since the original may have some headers (but otheriwse same url), that'll prevent the cache from matching.
			 *
			 * All the relevant data is stored in the url as search params so this is fine.
			 */
			// let normalizedRequest: Request | undefined;
			/** The final response at the end of processing that I can cache and do some stuff */
			let processedResponse: Response;

			// if (IS_HOSTED_ON_CLOUDFLARE) {
			// 	normalizedRequest = new Request(cleanedSrcUrl);

			// 	const cachedResponse = await caches.default.match(normalizedRequest);

			// 	if (cachedResponse) return cachedResponse;
			// }

			let { headers: fetchedHeaders, html: fetchedHtml } =
				await fetchHtmlText(cleanedSrcUrl);

			if (query.stripCspMetaTag_bwsvr8911) {
				fetchedHtml = stripOutCspMetaTagsFromHtmlString(fetchedHtml);
			}

			const {
				bytesSaved,
				html: minifiedHtml,
				size,
			} = await minifyHtmlString(fetchedHtml);

			processedResponse = new Response(minifiedHtml, {
				headers: fetchedHeaders,
			});

			if (processedResponse.ok) {
				processedResponse.headers.set(
					"cache-control",
					"public, max-age=2592000, stale-while-revalidate=3600",
				);
				processedResponse.headers.set(
					ProxyCustomHeaders.BYTES_SAVED,
					`${bytesSaved}`,
				);
				processedResponse.headers.set("content-length", `${size}`);
				processedResponse.headers.set(
					"content-type",
					"text/html; charset=UTF-8",
				);
			}

			// if (IS_HOSTED_ON_CLOUDFLARE && normalizedRequest) {
			// 	//@ts-expect-error `ctx` should exist in the worker's args if hosted on Cloudflare workers
			// 	const ctx = args.ctx as ExecutionContext;

			// 	const promise = caches.default.put(
			// 		normalizedRequest,
			// 		processedResponse.clone(),
			// 	);

			// 	// Optional access since, for some reason, this may be undefined :p
			// 	ctx?.waitUntil(promise);
			// }

			return processedResponse;
		},
		{ query: HtmlOptimizationPayloadSchema },
	)
	.get(
		`/${ServerAPIEndpoint.PROCESS_IMAGE}`,
		async (args) => {
			const {
				query,
				request: { url: rawRequestUrl },
			} = args;

			const cleanedSrcUrl =
				cleanlyExtractNestedUrlFromRawRequestUrl(rawRequestUrl);

			console.log("raw:", rawRequestUrl, "\n\ncleaned:", cleanedSrcUrl);

			/** Make a normalized request solely with the url for caching, since the original may have some headers (but otheriwse same url), that'll prevent the cache from matching.
			 *
			 * All the relevant data is stored in the url as search params so this is fine.
			 */
			let normalizedRequest: Request | undefined;
			/** The final response at the end of processing that I can cache and do some stuff */
			let processedResponse: Response;
			let relevantBytesSaved = 0;
			let processedNote: string | null = null;

			if (IS_HOSTED_ON_CLOUDFLARE) {
				normalizedRequest = new Request(cleanedSrcUrl);

				const cachedResponse = await caches.default.match(normalizedRequest);

				if (cachedResponse) return cachedResponse;
			}

			const { bytesSaved, url: possiblyRedirectedUrl } =
				await getCompressedImageUrlWithFallback({
					...query,
					zz_url_bwsvr8911: cleanedSrcUrl,
				});

			relevantBytesSaved = bytesSaved;

			if (possiblyRedirectedUrl !== cleanedSrcUrl) {
				processedResponse = await fetch(
					`${possiblyRedirectedUrl}#${REDIRECTED_SEARCH_PARAM_FLAG}`,

					{
						headers: SPOOFING_FETCH_HEADERS,
					},
				);
				processedNote = possiblyRedirectedUrl;
			} else {
				try {
					// Compress the image ourselves since none of the endpoints work
					const { bytesSaved, res: compressedResponse } =
						await compressImagefromUrl({
							format: query.format_bwsvr8911,
							preserveAnim: query.preserveAnim_bwsvr8911,
							quality: query.quality_bwsvr8911,
							url: cleanedSrcUrl,
						});

					relevantBytesSaved = bytesSaved;

					processedResponse = compressedResponse;
					processedNote = "self-compress";
				} catch (e) {
					console.warn(
						"Why did compression throw:",
						e,
						"on the url:",
						possiblyRedirectedUrl,
					);

					const urlToUse = query.default_bwsvr8911 || cleanedSrcUrl;

					// Default to the original url
					processedResponse = await fetch(
						`${urlToUse}#${REDIRECTED_SEARCH_PARAM_FLAG}`,
						{
							headers: SPOOFING_FETCH_HEADERS,
						},
					);

					processedNote = urlToUse;
				}
			}

			const processedResponseUrl = processedResponse.url;

			// Create a new Response to make headers mutable
			processedResponse = new Response(
				processedResponse.body,
				processedResponse,
			);

			if (processedResponse.ok) {
				processedResponse.headers.set(
					"Cache-Control",
					"public, max-age=2592000, stale-while-revalidate=3600",
				);
				processedResponse.headers.set(
					ProxyCustomHeaders.BYTES_SAVED,
					`${relevantBytesSaved}`,
				);
				processedResponse.headers.set(
					ProxyCustomHeaders.ENDPOINT_USED,
					processedNote || processedResponseUrl || "null",
				);

				if (IS_HOSTED_ON_CLOUDFLARE && normalizedRequest) {
					//@ts-expect-error `ctx` should exist in the worker's args if hosted on Cloudflare workers
					const ctx = args.ctx as ExecutionContext;

					const promise = caches.default.put(
						normalizedRequest,
						processedResponse.clone(),
					);

					// Optional access since, for some reason, this may be undefined :p
					ctx?.waitUntil(promise);
				}
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
