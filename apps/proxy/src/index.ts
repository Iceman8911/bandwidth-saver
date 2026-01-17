import {
	getCompressedImageUrlWithFallback,
	getProxyEnv,
	ImageCompressionPayloadSchema,
	REDIRECTED_SEARCH_PARAM_FLAG,
	ServerAPIEndpoint,
} from "@bandwidth-saver/shared";
import { Elysia } from "elysia";
import { compressImage } from "./compression";
import { cleanlyExtractUrlFromImageCompressorPayload } from "./url";

const env = getProxyEnv();

const app = new Elysia()
	.get(`/${ServerAPIEndpoint.HEALTH}`, ({ status }) => status(200))
	.get(
		`/${ServerAPIEndpoint.COMPRESS_IMAGE}`,
		// TODO: Maybe add custom compression using `imgproxy` or `sharp`
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
					const response = await fetch(redirectedUrl);

					const imgBuffer = await response.arrayBuffer();

					const [compressedImgBuffer, contentType] = await compressImage(
						imgBuffer,
						response.headers.get("content-type"),
						query,
					);

					set.headers["cache-control"] =
						"public, max-age=86400, stale-while-revalidate=3600";
					set.headers["content-length"] = compressedImgBuffer.byteLength;
					set.headers["content-type"] = contentType;
					set.headers.vary = "Accept";

					return Buffer.from(compressedImgBuffer);
				} catch (e) {
					console.warn("Why did sharp throw:", e, "on the url:", redirectedUrl);

					// Default to the original url
					return redirect(
						decodeURIComponent(
							`${query.url_bwsvr8911}#${REDIRECTED_SEARCH_PARAM_FLAG}`,
						),
					);
				}
			}
		},
		{
			query: ImageCompressionPayloadSchema,
		},
	)
	.listen(
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

export type ElysiaApp = typeof app;
