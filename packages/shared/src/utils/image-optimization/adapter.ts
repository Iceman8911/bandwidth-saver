import {
	IMAGE_COMPRESSOR_ENDPOINT_SET,
	ImageCompressorEndpoint,
	ServerAPIEndpoint,
} from "@bandwidth-saver/shared";
import * as v from "valibot";
import type {
	ImageCompressionAdapter,
	ImageCompressionPayloadSchema,
	ImageCompressionUrlConstructor,
} from "../../models/image-optimization";
import { UrlSchema } from "../../models/shared";
import { checkIfUrlReturnsValidImage } from "../fetch";

const isUrlAlreadyRedirectedToCompressionEndpoint = (
	url: string | URL,
): boolean => {
	for (const endpoint of IMAGE_COMPRESSOR_ENDPOINT_SET) {
		if (`${url}`.startsWith(endpoint)) return true;
	}

	return false;
};

const imageCompressionUrlConstructorWsrvNl: ImageCompressionUrlConstructor = ({
	url_bwsvr8911: url,
	quality_bwsvr8911: quality,
	preserveAnim_bwsvr8911: preserveAnim,
	format_bwsvr8911: format,
	default_bwsvr8911: defaultValue,
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

	if (defaultValue) result += `&default=${defaultValue}`;

	return v.parse(UrlSchema, result);
};

const imageCompressionUrlConstructorFlyImgIo: ImageCompressionUrlConstructor =
	({
		url_bwsvr8911: url,
		quality_bwsvr8911: quality,
		format_bwsvr8911: format,
	}) => {
		if (isUrlAlreadyRedirectedToCompressionEndpoint(url))
			return v.parse(UrlSchema, url);

		return v.parse(
			UrlSchema,
			`${ImageCompressorEndpoint.FLY_IMG_IO}/upload/q_${quality},o_${format}/${url}`,
		);
	};

const imageCompressionUrlConstructorIcdn: ImageCompressionUrlConstructor = ({
	url_bwsvr8911: url,
	format_bwsvr8911: format,
	quality_bwsvr8911: quality,
}) => {
	if (isUrlAlreadyRedirectedToCompressionEndpoint(url))
		return v.parse(UrlSchema, url);

	let baseUrl = `${ImageCompressorEndpoint.IMAGE_CDN}/${url}?quality=${quality}`;

	if (format !== "auto") {
		if (format === "jpg") baseUrl += "&format=jpeg";
		else baseUrl += `&format=${format}`;
	}

	return v.parse(UrlSchema, baseUrl);
};

const imageCompressionUrlConstructorFlyWebpCloud: ImageCompressionUrlConstructor =
	({ url_bwsvr8911: url }) => {
		if (isUrlAlreadyRedirectedToCompressionEndpoint(url))
			return v.parse(UrlSchema, url);

		return v.parse(
			UrlSchema,
			`${ImageCompressorEndpoint.FLY_WEBP_CLOUD}?url=${url}`,
		);
	};

const PROTOCOL_REGEX = /^.*\/\//;
const imageCompressionUrlConstructorFlyWordpress: ImageCompressionUrlConstructor =
	({ url_bwsvr8911: url, quality_bwsvr8911: quality }) => {
		if (isUrlAlreadyRedirectedToCompressionEndpoint(url))
			return v.parse(UrlSchema, url);

		const noProtocolUrl = url.replace(PROTOCOL_REGEX, "");

		return v.parse(
			UrlSchema,
			`${ImageCompressorEndpoint.WORDPRESS}/${noProtocolUrl}?quality=${quality}`,
		);
	};

const imageCompressionUrlConstructorFlyServeProxy: ImageCompressionUrlConstructor =
	({ url_bwsvr8911: url }) => {
		if (isUrlAlreadyRedirectedToCompressionEndpoint(url))
			return v.parse(UrlSchema, url);

		return v.parse(
			UrlSchema,
			`${ImageCompressorEndpoint.SERVE_PROXY}/?url=${url}`,
		);
	};

export const IMAGE_COMPRESSION_URL_CONSTRUCTORS = {
	[ImageCompressorEndpoint.WSRV_NL]: imageCompressionUrlConstructorWsrvNl,
	[ImageCompressorEndpoint.FLY_IMG_IO]: imageCompressionUrlConstructorFlyImgIo,
	[ImageCompressorEndpoint.IMAGE_CDN]: imageCompressionUrlConstructorIcdn,
	[ImageCompressorEndpoint.FLY_WEBP_CLOUD]:
		imageCompressionUrlConstructorFlyWebpCloud,
	[ImageCompressorEndpoint.WORDPRESS]:
		imageCompressionUrlConstructorFlyWordpress,
	[ImageCompressorEndpoint.SERVE_PROXY]:
		imageCompressionUrlConstructorFlyServeProxy,
} as const satisfies Record<
	ImageCompressorEndpoint,
	ImageCompressionUrlConstructor
>;

const imageCompressionAdapter: ImageCompressionAdapter = async (
	payload,
	urlConstructor,
) => {
	const newUrl = urlConstructor(payload);

	const { success } = await checkIfUrlReturnsValidImage(newUrl);
	if (!success) return null;

	const [originalUrlSizeString, altUrlSizeString] = await Promise.all([
		fetch(payload.url_bwsvr8911, { method: "HEAD" }).then(({ headers }) =>
			headers.get("content-length"),
		),
		fetch(newUrl, { method: "HEAD" }).then(({ headers }) =>
			headers.get("content-length"),
		),
	]);

	// If the compression endpoint can't bother to set the `content-type` header, don't bother either
	if (!altUrlSizeString) return payload.url_bwsvr8911;

	if (originalUrlSizeString) {
		const originalUrlSize = Number(originalUrlSizeString);
		const altUrlSize = Number(altUrlSizeString);

		return altUrlSize < originalUrlSize ? newUrl : payload.url_bwsvr8911;
	}

	return newUrl;
};

/**
 * Attempts to obtain the compressed image's url using available adapters with fallback.
 * Tries each adapter sequentially until one succeeds.
 *
 * @returns Compressed image's url or the original image url if all adapters fail
 */
export async function getCompressedImageUrlWithFallback(
	payload: ImageCompressionPayloadSchema,
): Promise<UrlSchema> {
	for (const urlConstructor of Object.values(
		IMAGE_COMPRESSION_URL_CONSTRUCTORS,
	)) {
		try {
			const result = await imageCompressionAdapter(payload, urlConstructor);
			if (result) return result;
		} catch (error) {
			console.warn(
				`Image compression adapter failed for ${payload.url_bwsvr8911}:`,
				error,
			);
		}
	}

	return v.parse(UrlSchema, `${payload.url_bwsvr8911}`);
}

export const customProxyUrlConstructor = (
	payload: ImageCompressionPayloadSchema,
	proxy: { host: string; port: `${number}` | number },
): UrlSchema => {
	// TODO: Add a better way to determine the protocol
	const urlWithoutQueryString = `${proxy.host === "localhost" ? `http://${proxy.host}:${proxy.port}/${ServerAPIEndpoint.COMPRESS_IMAGE}` : `https://${proxy.host}`}/${ServerAPIEndpoint.COMPRESS_IMAGE}`;

	const queryString = Object.entries(payload)
		.map(([key, entry]) => `${key}=${entry}`)
		.join("&");

	return v.parse(UrlSchema, `${urlWithoutQueryString}?${queryString}`);
};
