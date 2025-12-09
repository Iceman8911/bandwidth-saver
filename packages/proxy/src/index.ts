import {
	getCompressedImageUrlWithFallback,
	getProxyEnv,
	ImageCompressionPayloadSchema,
	REDIRECTED_SEARCH_PARAM_FLAG,
	ServerAPIEndpoint,
} from "@bandwidth-saver/shared";
import { Elysia } from "elysia";
import { compressImage } from "./compression";

const env = getProxyEnv();

const [REDIRECTED_SEARCH_PARAM_KEY = "", REDIRECTED_SEARCH_PARAM_VALUE = ""] =
	REDIRECTED_SEARCH_PARAM_FLAG.split("=");

const app = new Elysia()
	.get(
		`/${ServerAPIEndpoint.COMPRESS_IMAGE}`,
		// TODO: Maybe add custom compression using `imgproxy` or `sharp`
		async ({ query, redirect, set }) => {
			const redirectedUrl = await getCompressedImageUrlWithFallback(query);

			if (redirectedUrl !== query.url) {
				const redirectedUrlObject = new URL(redirectedUrl);

				redirectedUrlObject.searchParams.append(
					REDIRECTED_SEARCH_PARAM_KEY,
					REDIRECTED_SEARCH_PARAM_VALUE,
				);

				return redirect(`${redirectedUrlObject}`);
			} else {
				// Compress the image ourselves
				const response = await fetch(redirectedUrl);

				const imgBuffer = await response.arrayBuffer();

				const [compressedImgBuffer, contentType] = await compressImage(
					imgBuffer,
					query,
				);

				set.headers["content-type"] = contentType;

				return compressedImgBuffer;
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
