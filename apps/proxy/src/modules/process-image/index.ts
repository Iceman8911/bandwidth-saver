import {
	getCompressedImageUrlWithFallback,
	getSpoofingFetchHeaders,
	ImageCompressionPayloadSchema,
	ProxyCustomHeaders,
	REDIRECTED_SEARCH_PARAM_FLAG,
	ServerAPIEndpoint,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import Elysia from "elysia";

import { compressImagefromUrl } from "../../utils/image-optimization/manual-compression";
import { normaliseRequestByUrl } from "../../utils/request";
import { cleanlyExtractNestedUrlFromRawRequestUrl } from "../../utils/url";

const IS_HOSTED_ON_CLOUDFLARE =
	process.env.DEPLOYMENT_PLATFORM === "cloudflare";

export const processImageRoute = new Elysia()
	.onRequest(async ({ request }) => {
		if (IS_HOSTED_ON_CLOUDFLARE) {
			const cachedResponse = await caches.default.match(
				normaliseRequestByUrl(request),
			);

			if (cachedResponse) return cachedResponse;
		}
	})
	.state({ bytesSaved: 0, note: "" })
	.get(
		`/${ServerAPIEndpoint.PROCESS_IMAGE}`,
		async ({ query, request, store, redirect, headers }) => {
			const cleanedSrcUrl = cleanlyExtractNestedUrlFromRawRequestUrl(
				request.url,
			);

			/** The final response at the end of processing that I can cache and do some stuff */
			let processedResponse: Response;

			let possiblyRedirectedUrl: UrlSchema;

			if (query.forceManual_bwsvr8911) {
				// Don't do unnecessary work. if these 2 are the same, self-compression should be used
				possiblyRedirectedUrl = cleanedSrcUrl;
			} else {
				const { bytesSaved, url } = await getCompressedImageUrlWithFallback(
					{
						...query,
						zz_url_bwsvr8911: cleanedSrcUrl,
					},
					headers[ProxyCustomHeaders.DNR_COOKIE_STRING],
				);

				store.bytesSaved = bytesSaved;

				possiblyRedirectedUrl = url;
			}

			if (possiblyRedirectedUrl !== cleanedSrcUrl) {
				processedResponse = await fetch(
					`${possiblyRedirectedUrl}${REDIRECTED_SEARCH_PARAM_FLAG}`,
					{
						headers: getSpoofingFetchHeaders(),
					},
				);

				store.note = possiblyRedirectedUrl;
			} else {
				try {
					// Compress the image ourselves since none of the endpoints work / manual transformation is preferred
					const { bytesSaved, res: compressedResponse } =
						await compressImagefromUrl({
							cookieStr: headers[ProxyCustomHeaders.DNR_COOKIE_STRING],
							format: query.format_bwsvr8911,
							preserveAnim: !!query.preserveAnim_bwsvr8911,
							quality: query.quality_bwsvr8911,
							url: cleanedSrcUrl,
						});

					if (!bytesSaved)
						throw Error("Unable to save data. Falling back to a redirect.");

					store.bytesSaved = bytesSaved;

					processedResponse = compressedResponse;
					store.note = "self-compress";
				} catch (e) {
					console.warn(
						"Why did compression throw:",
						e,
						"on the url:",
						possiblyRedirectedUrl,
					);

					const urlToUse = query.default_bwsvr8911 || cleanedSrcUrl;

					store.note = urlToUse;

					// Default to the original url
					return redirect(`${urlToUse}${REDIRECTED_SEARCH_PARAM_FLAG}`);
				}
			}

			return processedResponse;
		},
		{
			async afterHandle(args) {
				const {
					request,
					set,
					store: { bytesSaved, note },
				} = args;

				const oldResponse = args.response as Response;
				const response = new Response(oldResponse.body, {
					headers: oldResponse.headers,
				});

				if (response.ok) {
					// To modify a proably old header, use the good o'l fashioned way
					response.headers.set(
						"cache-control",
						"public, max-age=2592000, stale-while-revalidate=3600",
					);

					set.headers["access-control-allow-origin"] = "*";

					set.headers[ProxyCustomHeaders.BYTES_SAVED] = `${bytesSaved}`;

					set.headers[ProxyCustomHeaders.ENDPOINT_USED] =
						note || response.url || "";

					if (IS_HOSTED_ON_CLOUDFLARE) {
						const promise = caches.default.put(
							normaliseRequestByUrl(request),
							response.clone(),
						);

						const { waitUntil } = await import("cloudflare:workers");
						waitUntil(promise);
					}
				}

				return response;
			},
			query: ImageCompressionPayloadSchema,
		},
	);
