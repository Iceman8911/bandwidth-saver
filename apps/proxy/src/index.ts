import {
	getCompressedImageUrlWithFallback,
	getFetchTimeoutSignal,
	getLikelyImageUrlMimeType,
	getProxyEnv,
	ImageCompressionPayloadSchema,
	REDIRECTED_SEARCH_PARAM_FLAG,
	ServerAPIEndpoint,
	SPOOFING_FETCH_HEADERS,
} from "@bandwidth-saver/shared";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { compressImage } from "./compression";
import { cleanlyExtractUrlFromImageCompressorPayload } from "./url";

const env = getProxyEnv();

const app = new Elysia({
	adapter:
		env.DEPLOYMENT_PLATFORM === "cloudflare" ? CloudflareAdapter : undefined,
})
	.get(`/${ServerAPIEndpoint.HEALTH}`, ({ status }) => status(200))
	.get(
		`/${ServerAPIEndpoint.COMPRESS_IMAGE}`,
		async ({ query, redirect, set }) => {
			// I'll make this cleaner later
			const redirectedUrl = await getCompressedImageUrlWithFallback({
				...query,
				url_bwsvr8911: cleanlyExtractUrlFromImageCompressorPayload(query),
			});

			if (redirectedUrl !== query.url_bwsvr8911) {
				return redirect(
					decodeURIComponent(
						`${redirectedUrl}#${REDIRECTED_SEARCH_PARAM_FLAG}`,
					),
				);
			} else {
				try {
					// Compress the image ourselves
					const response = await fetch(redirectedUrl, {
						headers: SPOOFING_FETCH_HEADERS,
						signal: getFetchTimeoutSignal(),
					});

					const imgBuffer = await response.arrayBuffer();
					const imgMimeType = getLikelyImageUrlMimeType(
						redirectedUrl,
						response.headers.get("content-type"),
					);

					if (!imgMimeType)
						throw Error(
							`Url, "${redirectedUrl}", has no valid image mime type.`,
						);

					const [compressedImgBuffer, contentType] = await compressImage({
						format: query.format_bwsvr8911,
						preserveAnim: query.preserveAnim_bwsvr8911,
						quality: query.quality_bwsvr8911,
						srcImg: imgBuffer,
						srcMimeType: imgMimeType,
					});

					set.headers["cache-control"] =
						"public, max-age=604800, stale-while-revalidate=3600";
					set.headers["content-length"] = compressedImgBuffer.byteLength;
					set.headers["content-type"] = contentType;
					set.headers.vary = "Accept";

					return Buffer.from(compressedImgBuffer);
				} catch (e) {
					console.warn(
						"Why did compression throw:",
						e,
						"on the url:",
						redirectedUrl,
					);

					// Default to the original url
					return redirect(
						`${query.url_bwsvr8911}#${REDIRECTED_SEARCH_PARAM_FLAG}`,
					);
				}
			}
		},
		{
			query: ImageCompressionPayloadSchema,
		},
	);

if (env.DEPLOYMENT_PLATFORM === "cloudflare") {
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

export default app;
