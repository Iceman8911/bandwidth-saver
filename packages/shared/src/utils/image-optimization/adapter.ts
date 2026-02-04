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
import {
	checkIfUrlReturnsValidImage,
	getFetchTimeoutSignal,
	SPOOFING_FETCH_HEADERS,
} from "../fetch";

const isUrlAlreadyRedirectedToCompressionEndpoint = (
	url: UrlSchema,
	...endPointsToCompareWith: string[]
): boolean => {
	const endpoints: ReadonlyArray<string> = endPointsToCompareWith.length
		? endPointsToCompareWith
		: [...IMAGE_COMPRESSOR_ENDPOINT_SET];

	return endpoints.some((endpoint) => url.startsWith(endpoint));
};

const imageCompressionUrlConstructorWsrvNl: ImageCompressionUrlConstructor = ({
	zz_url_bwsvr8911: url,
	quality_bwsvr8911: quality,
	preserveAnim_bwsvr8911: preserveAnim,
	format_bwsvr8911: format,
	default_bwsvr8911: defaultValue,
}) => {
	if (
		isUrlAlreadyRedirectedToCompressionEndpoint(
			url,
			ImageCompressorEndpoint.WSRV_NL,
		)
	)
		return url;

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

	return result as UrlSchema;
};

const imageCompressionUrlConstructorFlyImgIo: ImageCompressionUrlConstructor =
	({
		zz_url_bwsvr8911: url,
		quality_bwsvr8911: quality,
		format_bwsvr8911: format,
	}) => {
		if (
			isUrlAlreadyRedirectedToCompressionEndpoint(
				url,
				ImageCompressorEndpoint.FLY_IMG_IO,
			)
		)
			return url;

		return `${ImageCompressorEndpoint.FLY_IMG_IO}/upload/q_${quality},o_${format}/${url}` as UrlSchema;
	};

const imageCompressionUrlConstructorIcdn: ImageCompressionUrlConstructor = ({
	zz_url_bwsvr8911: url,
	format_bwsvr8911: format,
	quality_bwsvr8911: quality,
}) => {
	if (
		isUrlAlreadyRedirectedToCompressionEndpoint(
			url,
			ImageCompressorEndpoint.IMAGE_CDN,
		)
	)
		return url;

	let baseUrl = `${ImageCompressorEndpoint.IMAGE_CDN}/${url}?quality=${quality}`;

	if (format !== "auto") {
		if (format === "jpg") baseUrl += "&format=jpeg";
		else baseUrl += `&format=${format}`;
	}

	return baseUrl as UrlSchema;
};

const imageCompressionUrlConstructorFlyWebpCloud: ImageCompressionUrlConstructor =
	({ zz_url_bwsvr8911: url }) => {
		if (
			isUrlAlreadyRedirectedToCompressionEndpoint(
				url,
				ImageCompressorEndpoint.FLY_WEBP_CLOUD,
			)
		)
			return url;

		return `${ImageCompressorEndpoint.FLY_WEBP_CLOUD}?url=${url}` as UrlSchema;
	};

const PROTOCOL_REGEX = /^https?:\/\//;
const imageCompressionUrlConstructorFlyWordpress: ImageCompressionUrlConstructor =
	({ zz_url_bwsvr8911: url, quality_bwsvr8911: quality }) => {
		if (
			isUrlAlreadyRedirectedToCompressionEndpoint(
				url,
				ImageCompressorEndpoint.WORDPRESS,
			)
		)
			return url;

		const noProtocolUrl = url.replace(PROTOCOL_REGEX, "");

		return `${ImageCompressorEndpoint.WORDPRESS}/${noProtocolUrl}?quality=${quality}` as UrlSchema;
	};

const imageCompressionUrlConstructorFlyServeProxy: ImageCompressionUrlConstructor =
	({ zz_url_bwsvr8911: url }) => {
		if (
			isUrlAlreadyRedirectedToCompressionEndpoint(
				url,
				ImageCompressorEndpoint.SERVE_PROXY,
			)
		)
			return url;

		return `${ImageCompressorEndpoint.SERVE_PROXY}/?url=${url}` as UrlSchema;
	};

export const IMAGE_COMPRESSION_URL_CONSTRUCTORS = {
	[ImageCompressorEndpoint.WSRV_NL]: imageCompressionUrlConstructorWsrvNl,
	[ImageCompressorEndpoint.FLY_IMG_IO]: imageCompressionUrlConstructorFlyImgIo,
	[ImageCompressorEndpoint.WORDPRESS]:
		imageCompressionUrlConstructorFlyWordpress,
	[ImageCompressorEndpoint.FLY_WEBP_CLOUD]:
		imageCompressionUrlConstructorFlyWebpCloud,
	[ImageCompressorEndpoint.SERVE_PROXY]:
		imageCompressionUrlConstructorFlyServeProxy,
	[ImageCompressorEndpoint.IMAGE_CDN]: imageCompressionUrlConstructorIcdn,
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
		fetch(payload.zz_url_bwsvr8911, {
			headers: SPOOFING_FETCH_HEADERS,
			method: "HEAD",
			signal: getFetchTimeoutSignal(),
		})
			.then(({ headers }) => headers.get("content-length"))
			.catch(() => null),
		fetch(newUrl, {
			headers: SPOOFING_FETCH_HEADERS,
			method: "HEAD",
			signal: getFetchTimeoutSignal(),
		})
			.then(({ headers }) => headers.get("content-length"))
			.catch(() => null),
	]);

	// If the compression endpoint can't bother to set the `content-type` header, don't bother either
	if (!altUrlSizeString) return payload.zz_url_bwsvr8911;

	if (originalUrlSizeString) {
		const originalUrlSize = Number(originalUrlSizeString);
		const altUrlSize = Number(altUrlSizeString);

		// I'd rather only bother with actual compressed data. TAt the call site, I could just default to the original url if it's `null` here
		return altUrlSize <= originalUrlSize ? newUrl : null;
	}

	return newUrl;
};

const URL_CONSTRUCTOR_ARRAY = Object.values(IMAGE_COMPRESSION_URL_CONSTRUCTORS);
const URL_CONSTRUCTOR_KEYS = Object.keys(
	IMAGE_COMPRESSION_URL_CONSTRUCTORS,
).join(", ");

/**
 * Attempts to obtain the compressed image's url using available adapters with fallback.
 * Tries each adapter sequentially until one succeeds.
 *
 * @returns Compressed image's url or the original image url if all adapters fail
 */
export async function getCompressedImageUrlWithFallback(
	payload: ImageCompressionPayloadSchema,
): Promise<UrlSchema> {
	for (const urlConstructor of URL_CONSTRUCTOR_ARRAY) {
		try {
			const result = await imageCompressionAdapter(payload, urlConstructor);
			if (result) return result;
		} catch (error) {
			console.warn(
				"No valid compression url for '",
				payload.zz_url_bwsvr8911,
				"' found. Tried all of '",
				URL_CONSTRUCTOR_KEYS,
				"' ",
				error,
			);
		}
	}

	return payload.zz_url_bwsvr8911;
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
