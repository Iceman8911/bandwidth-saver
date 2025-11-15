import * as v from "valibot";
import type { ImageCompressionAdapter } from "@/models/image-optimization";
import { UrlSchema } from "@/models/shared";
import { ImageCompressorEndpoint } from "@/shared/constants";
import { fetchWithTimeout } from "../fetch";

const REQUEST_TIMEOUT = 3000;

const imageCompressionAdapterWsrvNl: ImageCompressionAdapter = async (
	url,
	quality = 75,
) => {
	const urlParams = new URLSearchParams({
		url: `${url}`,
		q: `${quality}`,
		output: "webp",
	});

	const newUrl = `${ImageCompressorEndpoint.WSRV_NL}?${urlParams}`;

	const response = await fetchWithTimeout(REQUEST_TIMEOUT, newUrl);

	if (!response.ok) return null;

	return v.parse(UrlSchema, newUrl);
};

const imageCompressionAdapterAlpacaCdn: ImageCompressionAdapter = async (
	url,
) => {
	const urlParams = new URLSearchParams({
		url: `${url}`,
	});

	const newUrl = `${ImageCompressorEndpoint.ALPACA_CDN}?${urlParams}`;

	const response = await fetchWithTimeout(REQUEST_TIMEOUT, newUrl);

	if (!response.ok) return null;

	return v.parse(UrlSchema, newUrl);
};

export const IMAGE_COMPRESSION_ADAPTERS = [
	imageCompressionAdapterWsrvNl,
	imageCompressionAdapterAlpacaCdn,
] as const satisfies ImageCompressionAdapter[];

/**
 * Attempts to obtain the compressed image's url using available adapters with fallback.
 * Tries each adapter sequentially until one succeeds.
 *
 * @returns Compressed image's url or the original image url if all adapters fail
 */
export async function getCompressedImageUrlWithFallback(
	...args: Parameters<ImageCompressionAdapter>
): Promise<UrlSchema> {
	for (const adapter of IMAGE_COMPRESSION_ADAPTERS) {
		try {
			const result = await adapter(...args);
			if (result) return result;
		} catch (error) {
			console.warn(`Image compression adapter failed for ${args[0]}:`, error);
		}
	}

	return v.parse(UrlSchema, `${args[0]}`);
}
