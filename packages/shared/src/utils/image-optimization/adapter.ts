import { ImageCompressorEndpoint } from "@bandwidth-saver/shared";
import * as v from "valibot";
import type {
	ImageCompressionAdapter,
	ImageCompressionPayloadSchema,
	ImageCompressionUrlConstructor,
} from "../../models/image-optimization";
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

const imageCompressionUrlConstructorWsrvNl: ImageCompressionUrlConstructor = ({
	url,
	quality,
	preserveAnim,
	format,
}) => {
	if (isUrlAlreadyRedirectedToCompressionEndpoint(url))
		return v.parse(UrlSchema, url);

	// Check if this is a regex substitution placeholder
	const n = preserveAnim ? "-1" : "1";

	let result = `${ImageCompressorEndpoint.WSRV_NL}/?url=${url}&q=${quality}&n=${n}`;

	// Add output format if specified
	if (format !== "auto" && format !== "avif") {
		result += `&output=${format}`;
	} else if (format === "avif") {
		// Fall back to webp since avif is not yet supported
		result += "&output=webp";
	}

	return v.parse(UrlSchema, result);
};

const imageCompressionUrlConstructorFlyImgIo: ImageCompressionUrlConstructor =
	({ url, quality, format }) => {
		if (isUrlAlreadyRedirectedToCompressionEndpoint(url))
			return v.parse(UrlSchema, url);

		return v.parse(
			UrlSchema,
			`${ImageCompressorEndpoint.FLY_IMG_IO}/upload/q_${quality},o_${format}/${url}`,
		);
	};

const imageCompressionUrlConstructorAlpacaCdn: ImageCompressionUrlConstructor =
	({ url }) => {
		if (isUrlAlreadyRedirectedToCompressionEndpoint(url))
			return v.parse(UrlSchema, url);

		return v.parse(
			UrlSchema,
			`${ImageCompressorEndpoint.ALPACA_CDN}/?url=${url}`,
		);
	};

const imageCompressionAdapter: ImageCompressionAdapter = async (
	payload,
	urlConstructor,
) => {
	const newUrl = urlConstructor(payload);

	const isValid = await checkIfUrlReturnsValidResponse(newUrl);
	if (!isValid) return null;

	return v.parse(UrlSchema, newUrl);
};

export const IMAGE_COMPRESSION_URL_CONSTRUCTORS = {
	[ImageCompressorEndpoint.WSRV_NL]: imageCompressionUrlConstructorWsrvNl,
	[ImageCompressorEndpoint.FLY_IMG_IO]: imageCompressionUrlConstructorFlyImgIo,
	[ImageCompressorEndpoint.ALPACA_CDN]: imageCompressionUrlConstructorAlpacaCdn,
} as const satisfies Record<
	ImageCompressorEndpoint,
	ImageCompressionUrlConstructor
>;

/**
 * Attempts to obtain the compressed image's url using available adapters with fallback.
 * Tries each adapter sequentially until one succeeds.
 *
 * @returns Compressed image's url or the original image url if all adapters fail
 */
export async function getCompressedImageUrlWithFallback(
	payload: ImageCompressionPayloadSchema,
): Promise<UrlSchema> {
	for (const url of Object.values(IMAGE_COMPRESSION_URL_CONSTRUCTORS)) {
		try {
			const result = await imageCompressionAdapter(payload, url);
			if (result) return result;
		} catch (error) {
			console.warn(
				`Image compression adapter failed for ${payload.url}:`,
				error,
			);
		}
	}

	return v.parse(UrlSchema, `${payload.url}`);
}
