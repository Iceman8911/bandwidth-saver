import {
	getCompressedImageUrlWithFallback,
	getProxyEnv,
	ImageCompressionPayloadSchema,
	REDIRECTED_SEARCH_PARAM_FLAG,
	ServerAPIEndpoint,
} from "@bandwidth-saver/shared";
import { Elysia } from "elysia";

const env = getProxyEnv();

const [REDIRECTED_SEARCH_PARAM_KEY = "", REDIRECTED_SEARCH_PARAM_VALUE = ""] =
	REDIRECTED_SEARCH_PARAM_FLAG.split("=");

const app = new Elysia()
	.get(
		`/${ServerAPIEndpoint.COMPRESS_IMAGE}`,
		// TODO: Maybe add custom compression using `imgproxy` or `sharp`
		async ({ query, redirect }) => {
			const redirectedUrl = await getCompressedImageUrlWithFallback(query);

			if (redirectedUrl !== query.url) {
				const redirectedUrlObject = new URL(redirectedUrl);

				redirectedUrlObject.searchParams.append(
					REDIRECTED_SEARCH_PARAM_KEY,
					REDIRECTED_SEARCH_PARAM_VALUE,
				);

				return redirect(String(redirectedUrlObject));
			} else {
				// custom compression
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
