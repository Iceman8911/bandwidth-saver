import { Result } from "@badrap/result";
import {
	getCompressedImageUrlWithFallback,
	getSpoofingFetchHeaders,
	ImageCompressionPayloadSchema,
	ProxyCustomHeaders,
	REDIRECTED_SEARCH_PARAM_FLAG,
	ServerAPIEndpoint,
	type UrlSchema,
	wrapErrorMessage,
	wrapErrorProneCode,
} from "@bandwidth-saver/shared";
import Elysia from "elysia";
import { CAN_PERFORM_MANUAL_COMPRESSION } from "../../shared/constants";
import { compressImagefromUrl } from "../../utils/image-optimization/manual-compression";
import { normaliseRequestByUrl } from "../../utils/request";
import { cleanlyExtractNestedUrlFromRawRequestUrl } from "../../utils/url";

interface ImageRouteState {
	bytesSaved: number;

	/** Debugging hint to send as a cookie in the response */
	note: string;
}

const DEFAULT_IMAGE_ROUTE_STATE: ImageRouteState = { bytesSaved: 0, note: "" };

const IS_HOSTED_ON_CLOUDFLARE =
	process.env.DEPLOYMENT_PLATFORM === "cloudflare";

interface PerformManualImageCompressionProps {
	cookieStr?: string | undefined;
	query: ImageCompressionPayloadSchema;
	url: UrlSchema;
}

type PerformManualImageCompressionResult = Result<{
	state: ImageRouteState;
	compressed: Response;
}>;

async function getManualImageCompressionResult({
	query,
	cookieStr,
	url,
}: PerformManualImageCompressionProps): Promise<PerformManualImageCompressionResult> {
	const compressionResult = await compressImagefromUrl({
		cookieStr,
		format: query.format_bwsvr8911,
		preserveAnim: !!query.preserveAnim_bwsvr8911,
		quality: query.quality_bwsvr8911,
		url,
	});

	return compressionResult.chain(({ bytesSaved, res }) => {
		if (!bytesSaved)
			return Result.err(
				wrapErrorMessage("Unable to save data. Falling back to a redirect."),
			);

		return Result.ok({
			compressed: res,
			state: { bytesSaved, note: "self-compress" },
		});
	});
}

export const processImageRoute = new Elysia()
	.onRequest(async ({ request }) => {
		if (IS_HOSTED_ON_CLOUDFLARE) {
			const cachedResponse = await caches.default.match(
				normaliseRequestByUrl(request),
			);

			if (cachedResponse) return cachedResponse;
		}
	})
	.state({ ...DEFAULT_IMAGE_ROUTE_STATE })
	.get(
		`/${ServerAPIEndpoint.PROCESS_IMAGE}`,
		async ({ query, request, store, redirect, headers, status }) => {
			function fallbackToRedirect(backupUrl: UrlSchema): Response {
				const urlToUse = query.default_bwsvr8911 || backupUrl;

				store.note = urlToUse;

				// Default to the original url
				return redirect(`${urlToUse}${REDIRECTED_SEARCH_PARAM_FLAG}`);
			}

			console.log("Request query:", query, "Request headers:", headers);

			const cleanedSrcUrlResult = cleanlyExtractNestedUrlFromRawRequestUrl(
				request.url,
			);

			if (cleanedSrcUrlResult.isErr) {
				console.error("Failed to extract the nested url from:", request.url);

				return status("Bad Request");
			}

			const cleanedSrcUrl = cleanedSrcUrlResult.value;
			const cookieStr = headers[ProxyCustomHeaders.DNR_COOKIE_STRING];

			if (!query.forceManual_bwsvr8911) {
				// Try checking if any remote endpoint works
				const {
					bytesSaved: bytesSavedFromCompressedImageUrl,
					url: compressedImageUrl,
				} = await getCompressedImageUrlWithFallback(
					{
						...query,
						zz_url_bwsvr8911: cleanedSrcUrl,
					},
					cookieStr,
					CAN_PERFORM_MANUAL_COMPRESSION,
				);

				if (compressedImageUrl !== cleanedSrcUrl) {
					const isUsingBackupProxy = query.backupEndpoints_bwsvr8911?.some(
						(endpoint) => compressedImageUrl.startsWith(endpoint),
					);

					return (
						await wrapErrorProneCode(() =>
							fetch(compressedImageUrl, {
								headers: getSpoofingFetchHeaders({
									cookieStr: isUsingBackupProxy ? cookieStr : undefined,
									isForBackupProxy: isUsingBackupProxy,
									url: compressedImageUrl,
								}),
							}),
						)
					)
						.chain(
							(res) => {
								store.bytesSaved = bytesSavedFromCompressedImageUrl;
								store.note = `compressed externally with ${compressedImageUrl}`;

								console.log(
									"Image at url",
									cleanedSrcUrl,
									"was successfully ",
									store.note,
								);

								return Result.ok(res);
							},
							(e) => {
								console.warn(
									"Failed to fetch image from:",
									compressedImageUrl,
									"With error:",
									e,
									"Falling back to redirect.",
								);

								return Result.ok(fallbackToRedirect(cleanedSrcUrl));
							},
						)
						.unwrap();
				}
			}
			//

			// Fallback to manual compression
			const props = { cookieStr, query, url: cleanedSrcUrl };
			const compressedResult = await getManualImageCompressionResult(props);

			return compressedResult
				.chain(
					({ compressed, state }) => {
						store.bytesSaved = state.bytesSaved;
						store.note = state.note;

						console.log(
							"Image at url",
							cleanedSrcUrl,
							"was successfully compressed manually",
						);

						return Result.ok(compressed);
					},
					(e) => {
						console.warn(
							"Failed to compress image using props:",
							props,
							"With error:",
							e,
							"Defaulting to redirect.",
						);

						return Result.ok(fallbackToRedirect(cleanedSrcUrl));
					},
				)
				.unwrap();
		},
		{
			async afterHandle(args) {
				const {
					request,
					set,
					store: { bytesSaved, note },
				} = args;

				const oldResponse = args.response as Response;

				// Do not re-wrap redirects, otherwise we may lose status/headers (Location) and cause blank navigations.
				if (oldResponse.status >= 300 && oldResponse.status < 400) {
					return oldResponse;
				}

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
