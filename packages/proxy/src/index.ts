import {
	getCompressedImageUrlWithFallback,
	ProxyImageCompressionPayloadSchema,
} from "@bandwidth-saver/shared";
import { Elysia } from "elysia";

export const elysiaApp = new Elysia()
	.get(
		"/compress-image/",
		// TODO: Maybe add custom compression using `imgproxy` or `sharp`
		async ({ query, redirect ,status}) => {
		try {
			const redirectedUrl = await getCompressedImageUrlWithFallback(
				query.url,
				query.quality,
			);

			return redirect(redirectedUrl);
		} catch  {
			return status(400, {
				message: "Failed to compress image",
			});
		}
		},
		{
			query: ProxyImageCompressionPayloadSchema,
		},
	)
	.listen(3000);
