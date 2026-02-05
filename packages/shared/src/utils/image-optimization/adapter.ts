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
import type { UrlSchema } from "../../models/shared";
import {
	getFetchTimeoutSignal,
	getLikelyImageUrlMimeType,
	type ImageMimeType,
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

	let result = `${ImageCompressorEndpoint.WSRV_NL}/?url=${encodeURIComponent(url)}&q=${quality}&n=${n}`;

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

		return `${ImageCompressorEndpoint.FLY_IMG_IO}/upload/q_${quality},o_${format}/${encodeURIComponent(url)}` as UrlSchema;
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

	let baseUrl = `${ImageCompressorEndpoint.IMAGE_CDN}/${encodeURIComponent(url)}?quality=${quality}`;

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

		return `${ImageCompressorEndpoint.FLY_WEBP_CLOUD}?url=${encodeURIComponent(url)}` as UrlSchema;
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

		return `${ImageCompressorEndpoint.WORDPRESS}/${encodeURIComponent(noProtocolUrl)}?quality=${quality}` as UrlSchema;
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

		return `${ImageCompressorEndpoint.SERVE_PROXY}/?url=${encodeURIComponent(url)}` as UrlSchema;
	};

/**
 * See https://cloudinary.com/documentation/transformation_reference
 */
const imageCompressionUrlConstructorCloudinary: ImageCompressionUrlConstructor =
	({
		zz_url_bwsvr8911: url,
		format_bwsvr8911: format,
		preserveAnim_bwsvr8911: preserveAnim,
		quality_bwsvr8911: quality,
		cloudinary_bwsvr8911: cloudName,
	}) => {
		if (
			!cloudName ||
			isUrlAlreadyRedirectedToCompressionEndpoint(
				url,
				ImageCompressorEndpoint.CLOUDINARY,
			)
		)
			return url;

		let params = `dpr_auto,fl_lossy,f_${format},q_${format === "auto" ? "auto:eco" : quality}`;

		if (preserveAnim) {
			params += ",fl_animated";

			if (format === "webp") params += ",fl_awebp";
		}

		return `${ImageCompressorEndpoint.CLOUDINARY}/${cloudName}/image/fetch/${params}/${encodeURIComponent(url)}` as UrlSchema;
	};

export const IMAGE_COMPRESSION_URL_CONSTRUCTORS = {
	[ImageCompressorEndpoint.WSRV_NL]: imageCompressionUrlConstructorWsrvNl,
	[ImageCompressorEndpoint.CLOUDINARY]:
		imageCompressionUrlConstructorCloudinary,
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

interface ContentLengthAndType {
	length?: number | null;
	type?: ImageMimeType | null;
}

const getContentLengthAndTypeFromUrl = async (
	url: UrlSchema,
): Promise<ContentLengthAndType> => {
	try {
		const { headers } = await fetch(url, {
			headers: SPOOFING_FETCH_HEADERS,
			method: "HEAD",
			signal: getFetchTimeoutSignal(),
		});

		const headersLength = Number(headers.get("content-length"));

		return {
			length: Number.isNaN(headersLength) ? null : headersLength,
			type: getLikelyImageUrlMimeType(url, headers.get("content-type")),
		};
	} catch {
		return {};
	}
};

interface CompressionUrlAndSavings {
	url: UrlSchema;
	bytesSaved: number;
}

const optimalImageCompressionAdapter = async (
	payload: ImageCompressionPayloadSchema,
	urlConstructor: ImageCompressionUrlConstructor,
): Promise<CompressionUrlAndSavings | null> => {
	const originalUrl = payload.zz_url_bwsvr8911;
	const altUrl = urlConstructor(payload);

	// If both urls are the same, let the call site try another compressor endpoint
	if (originalUrl === altUrl) return null;

	const [
		{ length: originalUrlSize, type: originalUrlType },
		{ length: altUrlSize, type: altUrlType },
	] = await Promise.all([
		getContentLengthAndTypeFromUrl(originalUrl),
		getContentLengthAndTypeFromUrl(altUrl),
	]);

	// If the compression endpoint can't bother to set the `content-type` or `content-length` header, don't bother either
	if (!altUrlSize || !altUrlType) return { bytesSaved: 0, url: originalUrl };

	if (originalUrlSize && originalUrlType) {
		// I'd rather only bother with actual compressed data. At the call site, I could just default to the original url if it's `null` here
		const bytesSaved = originalUrlSize - altUrlSize;

		return bytesSaved >= 0 ? { bytesSaved, url: altUrl } : null;
	}

	return { bytesSaved: 0, url: altUrl };
};

const URL_CONSTRUCTOR_ARRAY_WITH_ANIMATION_PRESERVATION = [
	IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.WSRV_NL],
	IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.WORDPRESS],
	IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.CLOUDINARY],
	IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.SERVE_PROXY],
] as const satisfies ImageCompressionUrlConstructor[];

const URL_CONSTRUCTOR_ARRAY_WITH_ANIMATION_DISABLING = [
	IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.WSRV_NL],
	IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.CLOUDINARY],
	IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.FLY_WEBP_CLOUD],
	IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.FLY_IMG_IO],
	IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.IMAGE_CDN],
] as const satisfies ImageCompressionUrlConstructor[];

async function getFirstUsefulCompressedImageUrl(
	payload: ImageCompressionPayloadSchema,
	urlConstructorArray: ImageCompressionUrlConstructor[],
): Promise<CompressionUrlAndSavings | null> {
	return Promise.any(
		urlConstructorArray.map(async (c) => {
			const value = await optimalImageCompressionAdapter(payload, c);

			if (value) return value;

			// Reject so Promise.any ignores this result.
			throw new Error("No useful value");
		}),
	).catch(() => null);
}

/**
 * Attempts to obtain the compressed image's url using available adapters with fallback.
 * Tries each adapter sequentially until one succeeds.
 *
 * @returns Compressed image's url or the original image url if all adapters fail
 */
export async function getCompressedImageUrlWithFallback(
	payload: ImageCompressionPayloadSchema,
): Promise<CompressionUrlAndSavings> {
	const tryPreserveAnim = payload.preserveAnim_bwsvr8911,
		originalUrl = payload.zz_url_bwsvr8911;

	const firstUseful = await getFirstUsefulCompressedImageUrl(
		payload,
		tryPreserveAnim
			? URL_CONSTRUCTOR_ARRAY_WITH_ANIMATION_PRESERVATION
			: URL_CONSTRUCTOR_ARRAY_WITH_ANIMATION_DISABLING,
	);

	if (firstUseful) return firstUseful;

	// Since the user's preferred choice was a bust, try out the remaining options
	const secondUseful = await getFirstUsefulCompressedImageUrl(
		payload,
		tryPreserveAnim
			? URL_CONSTRUCTOR_ARRAY_WITH_ANIMATION_DISABLING
			: URL_CONSTRUCTOR_ARRAY_WITH_ANIMATION_PRESERVATION,
	);

	if (secondUseful) return secondUseful;

	console.warn(
		"No valid compression url for '",
		originalUrl,
		"' found. Falling back to original url",
	);

	return { bytesSaved: 0, url: originalUrl };
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

	return `${urlWithoutQueryString}?${queryString}` as UrlSchema;
};
