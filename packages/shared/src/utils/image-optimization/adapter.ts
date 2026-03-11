import {
	IMAGE_COMPRESSOR_ENDPOINT_SET,
	ImageCompressorEndpoint,
	type ServerAPIEndpoint,
} from "@bandwidth-saver/shared";
import type { ReadonlyDeep } from "type-fest";
import type {
	ImageCompressionPayloadSchema,
	ImageCompressionUrlConstructor,
} from "../../models/image-optimization";
import type { UrlSchema } from "../../models/shared";

const isUrlAlreadyRedirectedToCompressionEndpoint = (
	url: UrlSchema,
	...endPointsToCompareWith: string[]
): boolean => {
	const endpoints: ReadonlyArray<string> = endPointsToCompareWith.length
		? endPointsToCompareWith
		: [...IMAGE_COMPRESSOR_ENDPOINT_SET];

	return endpoints.some((endpoint) => url.startsWith(endpoint));
};

const isUrlActuallyDnrReplacementCaptureGroup = (urlish: string): boolean => {
	return urlish.startsWith("\\");
};

const encodeUrlIfNecessary = (url: string) =>
	isUrlActuallyDnrReplacementCaptureGroup(url) ? url : encodeURIComponent(url);

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

	let result = `${ImageCompressorEndpoint.WSRV_NL}/?url=${encodeUrlIfNecessary(url)}&q=${quality}&n=${n}`;

	// Add output format if specified
	if (format !== "auto" && format !== "avif") {
		result += `&output=${format}`;
	} else {
		// Fall back to webp since it's usually da best
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

		return `${ImageCompressorEndpoint.FLY_IMG_IO}/upload/q_${quality},o_${format}/${encodeUrlIfNecessary(url)}` as UrlSchema;
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

	let baseUrl = `${ImageCompressorEndpoint.IMAGE_CDN}/${encodeUrlIfNecessary(url)}?quality=${quality}`;

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

		return `${ImageCompressorEndpoint.FLY_WEBP_CLOUD}?url=${encodeUrlIfNecessary(url)}` as UrlSchema;
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

		return `${ImageCompressorEndpoint.SERVE_PROXY}/?url=${encodeUrlIfNecessary(url)}` as UrlSchema;
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

		let params = `dpr_auto,fl_lossy,f_${format},q_${quality}`;

		if (preserveAnim) {
			params += ",fl_animated";

			if (format === "webp") params += ",fl_awebp";
		}

		return `${ImageCompressorEndpoint.CLOUDINARY}/${cloudName}/image/fetch/${params}/${encodeUrlIfNecessary(url)}` as UrlSchema;
	};

type ProxyUrlConstructorPayload = ReadonlyDeep<{
	mainEndpoint: UrlSchema;
	payload: ImageCompressionPayloadSchema;
	path: ServerAPIEndpoint.PROCESS_IMAGE;
}>;

export function proxyUrlConstructor({
	path,
	payload,
	mainEndpoint,
}: ProxyUrlConstructorPayload): UrlSchema {
	const urlWithoutQueryString = `${mainEndpoint}/${path}`;

	const queryString = Object.entries(payload)
		.map(
			([key, val]) =>
				`${key}=${Array.isArray(val) ? JSON.stringify(val) : val}`,
		)
		.join("&");

	return `${urlWithoutQueryString}?${queryString}` as UrlSchema;
}

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
