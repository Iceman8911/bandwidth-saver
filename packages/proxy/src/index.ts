import {
	getCompressedImageUrlWithFallback,
	getProxyEnv,
	ImageCompressionPayloadSchema,
	ServerAPIEndpoint,
} from "@bandwidth-saver/shared";
import { Elysia } from "elysia";

const env = getProxyEnv();

const app = new Elysia()
	.get(
		`/${ServerAPIEndpoint.COMPRESS_IMAGE}`,
		// TODO: Maybe add custom compression using `imgproxy` or `sharp`
		async ({ query, redirect, status }) => {
			try {
				const redirectedUrl = await getCompressedImageUrlWithFallback(query);

				return redirect(redirectedUrl);
			} catch {
				return status(400, {
					message: "Failed to compress image",
				});
			}
		},
		{
			query: ImageCompressionPayloadSchema,
		},
	)
	.listen(env.VITE_SERVER_PORT);

export type ElysiaApp = typeof app;
