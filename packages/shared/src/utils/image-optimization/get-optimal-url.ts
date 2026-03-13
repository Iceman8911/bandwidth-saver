import { Result } from "@badrap/result";
import { lru } from "tiny-lru";
import { ImageCompressorEndpoint, ServerAPIEndpoint } from "../../constants";
import { getProxyEnv } from "../../models/env";
import type {
	ImageCompressionPayloadOutput,
	ImageCompressionUrlConstructor,
} from "../../models/image-optimization";
import type { UrlOutput } from "../../models/shared";
import { wrapErrorProneCode } from "../error";
import {
	getFetchTimeoutSignal,
	getLikelyImageUrlMimeType,
	getSpoofingFetchHeaders,
	type ImageMimeType,
} from "../fetch";
import {
	IMAGE_COMPRESSION_URL_CONSTRUCTORS,
	proxyUrlConstructor,
} from "./adapter";

interface GetContentLengthAndTypeFromUrlProps {
	url: UrlOutput;
	cookieStr?: string;
	isForBackupProxy?: boolean;
}

interface ContentLengthAndType {
	length?: number | null;
	type?: ImageMimeType | null;
}

const getContentLengthAndTypeFromUrlCache = lru<ContentLengthAndType>(
	1000,
	30 * 1000,
);

const getContentLengthAndTypeFromUrlCacheKey = (
	props: GetContentLengthAndTypeFromUrlProps,
): string =>
	`${props.url}-${props.isForBackupProxy}-${props.cookieStr ? "cookie :D" : "no cookie :p"}`;

const getContentLengthAndTypeFromUrl = async (
	props: GetContentLengthAndTypeFromUrlProps,
): Promise<Result<ContentLengthAndType>> => {
	return wrapErrorProneCode(async () => {
		const cacheKey = getContentLengthAndTypeFromUrlCacheKey(props);

		const possibleCachedReturnVal =
			getContentLengthAndTypeFromUrlCache.get(cacheKey);

		if (possibleCachedReturnVal) return possibleCachedReturnVal;

		const res = await fetch(props.url, {
			headers: getSpoofingFetchHeaders(props),
			method: "HEAD",
			signal: getFetchTimeoutSignal(5000),
		});

		if (!res.ok) return {};

		const headersLength = Number(res.headers.get("content-length"));

		const returnVal: ContentLengthAndType = {
			length: Number.isNaN(headersLength) ? null : headersLength,
			type: getLikelyImageUrlMimeType(
				props.url,
				res.headers.get("content-type"),
			),
		};

		getContentLengthAndTypeFromUrlCache.set(cacheKey, returnVal);

		return returnVal;
	});
};

interface CompressionUrlAndSavings {
	url: UrlOutput;
	bytesSaved: number;
}

interface OptimalImageCompressionAdapterProps {
	payload: ImageCompressionPayloadOutput;
	urlConstructor: ImageCompressionUrlConstructor;
	cookieStr?: string;
	isUsingBackupProxy?: boolean;
}

/** This intentionally doesn't look for the endpoint with the smallest size, just the one with a smaller size that arrives first for perf */
const getProvablySmallerCompressionUrl = async (
	props: OptimalImageCompressionAdapterProps,
): Promise<CompressionUrlAndSavings | null> => {
	const originalUrl = props.payload.zz_url_bwsvr8911;
	const altUrl = props.urlConstructor(props.payload);

	// If both urls are the same, let the call site try another compressor endpoint
	if (originalUrl === altUrl) return null;

	const [originalUrlInfoResult, altUrlInfoResult] = await Promise.all([
		getContentLengthAndTypeFromUrl({
			cookieStr: props.cookieStr,
			isForBackupProxy: props.isUsingBackupProxy,
			url: originalUrl,
		}),
		getContentLengthAndTypeFromUrl({
			cookieStr: props.isUsingBackupProxy ? props.cookieStr : undefined,
			isForBackupProxy: props.isUsingBackupProxy,
			url: altUrl,
		}),
	]);

	const result: Result<CompressionUrlAndSavings | null> = Result.all([
		originalUrlInfoResult,
		altUrlInfoResult,
	]).chain(
		([
			{ length: originalUrlSize, type: originalUrlType },
			{ length: altUrlSize, type: altUrlType },
		]) => {
			console.log(
				"Original Url:",
				originalUrl,
				"Size:",
				originalUrlSize,
				"Type:",
				originalUrlType,
			);
			console.log("Alt Url:", altUrl, "Size:", altUrlSize, "Type:", altUrlType);

			// do not compress svgs
			if (originalUrlType === "image/svg+xml" || altUrlType === "image/svg+xml")
				return Result.ok(null);

			// If the compression endpoint can't bother to set the `content-type` or `content-length` header, let the call site try another
			if (!altUrlSize || !altUrlType) return Result.ok(null);

			if (originalUrlSize && originalUrlType) {
				// I'd rather only bother with actual compressed data. At the call site, I could just default to the original url if it's `null` here
				const bytesSaved = originalUrlSize - altUrlSize;

				return bytesSaved > 0
					? Result.ok({ bytesSaved, url: altUrl })
					: Result.ok(null);
			}

			return Result.ok({ bytesSaved: 0, url: altUrl });
		},
		(e) => {
			console.warn(
				"When comparing adapters for the original url:",
				originalUrl,
				"and alternative url:",
				altUrl,
				"Got an error:",
				e,
			);

			return Result.ok(null);
		},
	);

	return result.unwrap();
};

const URL_ENDPOINT_ARRAY_WITH_ANIMATION_PRESERVATION = [
	ImageCompressorEndpoint.WSRV_NL,
	ImageCompressorEndpoint.SERVE_PROXY,
	ImageCompressorEndpoint.WORDPRESS,
	ImageCompressorEndpoint.CLOUDINARY,
] as const satisfies ImageCompressorEndpoint[];

const URL_ENDPOINT_ARRAY_WITH_ANIMATION_DISABLING = [
	ImageCompressorEndpoint.WSRV_NL,
	ImageCompressorEndpoint.FLY_WEBP_CLOUD,
	ImageCompressorEndpoint.FLY_IMG_IO,
	ImageCompressorEndpoint.IMAGE_CDN,
	ImageCompressorEndpoint.CLOUDINARY,
] as const satisfies ImageCompressorEndpoint[];

const getEndpointConstructorArray = (
	endpoints: ReadonlyArray<ImageCompressorEndpoint>,
): ReadonlyArray<ImageCompressionUrlConstructor> =>
	endpoints.map((endpoint) => IMAGE_COMPRESSION_URL_CONSTRUCTORS[endpoint]);

interface GetFirstUsefulCompressedImageUrlProps {
	payload: ImageCompressionPayloadOutput;
	urlConstructorArray: ReadonlyArray<ImageCompressionUrlConstructor>;
	cookieStr?: string;
	isUsingBackupProxy?: boolean;
}

async function getFirstUsefulCompressedImageUrl(
	props: GetFirstUsefulCompressedImageUrlProps,
): Promise<CompressionUrlAndSavings | null> {
	return Promise.any(
		props.urlConstructorArray.map(async (urlConstructor) => {
			const value = await getProvablySmallerCompressionUrl({
				cookieStr: props.cookieStr,
				isUsingBackupProxy: props.isUsingBackupProxy,
				payload: props.payload,
				urlConstructor,
			});

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
	payload: ImageCompressionPayloadOutput,
	cookieStr?: string,
	canManualCompress?: boolean,
): Promise<CompressionUrlAndSavings> {
	const tryPreserveAnim = payload.preserveAnim_bwsvr8911,
		originalUrl = payload.zz_url_bwsvr8911;

	const mostIdealEndpointBatch = tryPreserveAnim
		? ([
				URL_ENDPOINT_ARRAY_WITH_ANIMATION_PRESERVATION,
				getEndpointConstructorArray(
					URL_ENDPOINT_ARRAY_WITH_ANIMATION_PRESERVATION,
				),
			] as const)
		: ([
				URL_ENDPOINT_ARRAY_WITH_ANIMATION_DISABLING,
				getEndpointConstructorArray(
					URL_ENDPOINT_ARRAY_WITH_ANIMATION_DISABLING,
				),
			] as const);

	console.log(
		"Since animation preservation is set to",
		tryPreserveAnim,
		". Trying most-ideal endpoints:",
		mostIdealEndpointBatch[0],
	);

	const mostIdealResult = await getFirstUsefulCompressedImageUrl({
		cookieStr,
		payload,
		urlConstructorArray: mostIdealEndpointBatch[1],
	});

	if (mostIdealResult) return mostIdealResult;

	console.log("No viable compression endpoint found in the most-ideal batch");

	if (payload.backupEndpoints_bwsvr8911?.length) {
		console.log("Trying backup endpoints:", payload.backupEndpoints_bwsvr8911);

		const newPayload: ImageCompressionPayloadOutput = {
			...payload,
			/** To prevent possible smelly recursion */
			backupEndpoints_bwsvr8911: [],
			/** The only real reason to use other backup proxies is to do heavy transformation that may fail on some serverless runtimes like cloudflare workers  */
			forceManual_bwsvr8911: true,
		};

		const backupResult = await getFirstUsefulCompressedImageUrl({
			cookieStr,
			isUsingBackupProxy: true,
			payload: newPayload,
			urlConstructorArray: payload.backupEndpoints_bwsvr8911.map(
				(endpoint: UrlOutput) => (p: ImageCompressionPayloadOutput) =>
					proxyUrlConstructor({
						mainEndpoint: endpoint,
						path: ServerAPIEndpoint.PROCESS_IMAGE,
						payload: p,
					}),
			),
		});

		if (backupResult) return backupResult;

		console.log("No viable compression endpoint found in the backup batch");
	}

	if (!canManualCompress) {
		const lastResortEndpointBatch = tryPreserveAnim
			? ([
					URL_ENDPOINT_ARRAY_WITH_ANIMATION_DISABLING,
					getEndpointConstructorArray(
						URL_ENDPOINT_ARRAY_WITH_ANIMATION_DISABLING,
					),
				] as const)
			: ([
					URL_ENDPOINT_ARRAY_WITH_ANIMATION_PRESERVATION,
					getEndpointConstructorArray(
						URL_ENDPOINT_ARRAY_WITH_ANIMATION_PRESERVATION,
					),
				] as const);

		console.log(
			"Since animation preservation is set to",
			tryPreserveAnim,
			". Trying last resort endpoints:",
			lastResortEndpointBatch[0],
		);

		// Since the user's preferred choice was a bust, and backup proxies weren't of help, try out the remaining options
		const lastResortResult = await getFirstUsefulCompressedImageUrl({
			cookieStr,
			payload,
			urlConstructorArray: lastResortEndpointBatch[1],
		});

		if (lastResortResult) return lastResortResult;
	}

	console.log(
		"No viable compression endpoint found in the last-resort endpoints batch",
	);

	console.warn(
		"No valid compression url redirect found for '",
		originalUrl,
		"when called with arguments",
		arguments,
	);

	return { bytesSaved: 0, url: originalUrl };
}
