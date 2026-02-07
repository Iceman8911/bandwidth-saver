import {
	getCompressedImageUrlWithFallback,
	ImageCompressionPayloadSchema,
	ProxyCustomHeaders,
	REDIRECTED_SEARCH_PARAM_FLAG,
	ServerAPIEndpoint,
	SPOOFING_FETCH_HEADERS,
} from "@bandwidth-saver/shared";
import Elysia from "elysia";
import * as v from "valibot";
import { compressImagefromUrl } from "../../image-compression";
import { cleanlyExtractNestedUrlFromRawRequestUrl } from "../../url";
import type { AugumentWithCloudflareContextAndEnv } from "../../utils/cloudflare-patch";
import { normaliseRequestByUrl } from "../../utils/request";

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
		async ({ query: rawQuery, request, store }) => {
			const cleanedSrcUrl = cleanlyExtractNestedUrlFromRawRequestUrl(
				request.url,
			);

			console.log("raw:", request.url, "\n\ncleaned:", cleanedSrcUrl);

			/** The final response at the end of processing that I can cache and do some stuff */
			let processedResponse: Response;

			// In aot-less mode, manual parsing is required since for some reason elysia may throw :p
			const query = v.parse(ImageCompressionPayloadSchema, rawQuery);

			const { bytesSaved, url: possiblyRedirectedUrl } =
				await getCompressedImageUrlWithFallback({
					...query,
					zz_url_bwsvr8911: cleanedSrcUrl,
				});

			store.bytesSaved = bytesSaved;

			if (possiblyRedirectedUrl !== cleanedSrcUrl) {
				processedResponse = await fetch(
					`${possiblyRedirectedUrl}#${REDIRECTED_SEARCH_PARAM_FLAG}`,

					{
						headers: SPOOFING_FETCH_HEADERS,
					},
				);

				store.note = possiblyRedirectedUrl;
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

					// Default to the original url
					processedResponse = await fetch(
						`${urlToUse}#${REDIRECTED_SEARCH_PARAM_FLAG}`,
						{
							headers: SPOOFING_FETCH_HEADERS,
						},
					);

					store.note = urlToUse;
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
					ctx,
				} = args as AugumentWithCloudflareContextAndEnv<typeof args>;

				// `responseValue` doesn't exist. Elysia's types are mangled here
				const response = (args.response as Response).clone();

				if (response.ok) {
					set.headers["cache-control"] =
						"public, max-age=2592000, stale-while-revalidate=3600";

					set.headers[ProxyCustomHeaders.BYTES_SAVED] = `${bytesSaved}`;

					set.headers[ProxyCustomHeaders.ENDPOINT_USED] =
						note || response.url || "";

					if (IS_HOSTED_ON_CLOUDFLARE) {
						const promise = caches.default.put(
							normaliseRequestByUrl(request),
							response.clone(),
						);

						ctx.waitUntil(promise);
					}
				}

				return response;
			},
			// query: ImageCompressionPayloadSchema,
		},
	);
