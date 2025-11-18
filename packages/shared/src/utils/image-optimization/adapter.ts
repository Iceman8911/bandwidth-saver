import { ImageCompressorEndpoint } from "@bandwidth-saver/shared";
import * as v from "valibot";
import type { ImageCompressionAdapter } from "../../models/image-optimization";
import { UrlSchema } from "../../models/shared";
import { checkIfUrlReturnsValidResponse } from "../fetch";

const isUrlAlreadyRedirectedToCompressionEndpoint = (
	url: string | URL,
): boolean => {
	for (const endpoint of Object.values(ImageCompressorEndpoint)) {
		if (`${url}`.startsWith(endpoint)) return true;
	}

	return false;
};

const imageCompressionAdapterWsrvNl: ImageCompressionAdapter = async (
	{url,
	quality = 60,
	preserveAnim = false}
) => {
	if (isUrlAlreadyRedirectedToCompressionEndpoint(url))
		return v.parse(UrlSchema, url);

	const urlParams = new URLSearchParams({
		output: "webp",
		q: `${quality}`,
		url: `${url}`,
		n: preserveAnim ? "-1" : "1"
	});

	const newUrl = `${ImageCompressorEndpoint.WSRV_NL}?${urlParams}`;

	const isValid = await checkIfUrlReturnsValidResponse(newUrl);
	if (!isValid) return null;

	return v.parse(UrlSchema, newUrl);
};

const imageCompressionAdapterFlyImgIo: ImageCompressionAdapter = async (
	{url, quality = 60}
) => {
	if (isUrlAlreadyRedirectedToCompressionEndpoint(url))
		return v.parse(UrlSchema, url);

	const newUrl = `${ImageCompressorEndpoint.FLY_IMG_IO}/upload/q_${quality}/${url}`;

	const isValid = await checkIfUrlReturnsValidResponse(newUrl);
	if (!isValid) return null;

	return v.parse(UrlSchema, newUrl);
};

const imageCompressionAdapterAlpacaCdn: ImageCompressionAdapter = async (
	{url}
) => {
	if (isUrlAlreadyRedirectedToCompressionEndpoint(url))
		return v.parse(UrlSchema, url);

	const urlParams = new URLSearchParams({
		url: `${url}`,
	});

	const newUrl = `${ImageCompressorEndpoint.ALPACA_CDN}?${urlParams}`;

	const isValid = await checkIfUrlReturnsValidResponse(newUrl);
	if (!isValid) return null;

	return v.parse(UrlSchema, newUrl);
};

export const IMAGE_COMPRESSION_ADAPTERS = [
	imageCompressionAdapterWsrvNl,
	imageCompressionAdapterFlyImgIo,
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
