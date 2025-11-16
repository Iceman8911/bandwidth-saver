import { ImageCompressorEndpoint } from "@bandwidth-saver/shared";
import * as v from "valibot";
import type { ImageCompressionAdapter } from "@/models/image-optimization";
import { RuntimeMessageSchema } from "@/models/message";
import { UrlSchema } from "@/models/shared";
import { MessageType } from "@/shared/constants";

const isUrlAlreadyRedirectedToCompressionEndpoint = (
	url: string | URL,
): boolean => {
	for (const endpoint of Object.values(ImageCompressorEndpoint)) {
		if (`${url}`.startsWith(endpoint)) return true;
	}

	return false;
};

/** Since the content script is subject to CORS */
const validateUrlViaBackground = async (url: string): Promise<boolean> => {
	try {
		const response = await browser.runtime.sendMessage(
			v.parse(RuntimeMessageSchema, {
				type: MessageType.VALIDATE_URL,
				url,
			}),
		);
		return response.success === true;
	} catch {
		return false;
	}
};

const imageCompressionAdapterWsrvNl: ImageCompressionAdapter = async (
	url,
	quality = 75,
) => {
	if (isUrlAlreadyRedirectedToCompressionEndpoint(url))
		return v.parse(UrlSchema, url);

	const urlParams = new URLSearchParams({
		output: "webp",
		q: `${quality}`,
		url: `${url}`,
	});

	const newUrl = `${ImageCompressorEndpoint.WSRV_NL}?${urlParams}`;

	const isValid = await validateUrlViaBackground(newUrl);
	if (!isValid) return null;

	return v.parse(UrlSchema, newUrl);
};

const imageCompressionAdapterAlpacaCdn: ImageCompressionAdapter = async (
	url,
) => {
	if (isUrlAlreadyRedirectedToCompressionEndpoint(url))
		return v.parse(UrlSchema, url);

	const urlParams = new URLSearchParams({
		url: `${url}`,
	});

	const newUrl = `${ImageCompressorEndpoint.ALPACA_CDN}?${urlParams}`;

	const isValid = await validateUrlViaBackground(newUrl);
	if (!isValid) return null;

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
