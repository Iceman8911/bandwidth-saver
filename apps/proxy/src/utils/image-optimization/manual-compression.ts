import { Result } from "@badrap/result";
import {
	getFetchTimeoutSignal,
	getLikelyImageUrlMimeType,
	getSpoofingFetchHeaders,
	type ImageFormatSchema,
	type ImageMimeType,
	type NumberBetween1and100Inclusively,
	type UrlSchema,
	wrapErrorMessage,
	wrapErrorProneCode,
} from "@bandwidth-saver/shared";
import type { Sharp } from "sharp";

const EFFORT_LEVEL = 5;

interface ImageCompressorHandlerPayload {
	format: ImageFormatSchema;
	preserveAnim: boolean;
	quality: NumberBetween1and100Inclusively;
	srcImg: ArrayBuffer;
	srcMimeType: ImageMimeType;
}

type ImageCompressorHandler = (
	payload: ImageCompressorHandlerPayload,
) => Promise<Result<[Uint8Array, ImageMimeType]>>;

/** May throw on certain serverless setups since it requires native node bindings */
const compressImageUsingSharp: ImageCompressorHandler = async ({
	format,
	preserveAnim,
	quality,
	srcImg,
	srcMimeType,
}) => {
	const { default: sharp } = await import("sharp");
	const baseSharpInstance = sharp(srcImg, {
		animated: preserveAnim,
	});

	const {
		hasAlpha,
		format: sharpFormat,
		isProgressive,
	} = await baseSharpInstance.metadata();

	let processedSharpInstance: Sharp;
	let actualFormatUsed = sharpFormat;

	switch (format) {
		case "auto":
			if (hasAlpha) {
				processedSharpInstance = baseSharpInstance.webp({
					effort: EFFORT_LEVEL,
					nearLossless: true,
					quality,
					smartSubsample: true,
				});
				actualFormatUsed = "webp";
			} else if (sharpFormat === "jpeg" || sharpFormat === "jpg") {
				// Slightly reduce the quality
				processedSharpInstance = baseSharpInstance.jpeg({
					mozjpeg: true,
					progressive: isProgressive,
					quality: Math.round(quality * 0.85),
				});
				actualFormatUsed = "jpeg";
			} else {
				processedSharpInstance = baseSharpInstance.avif({
					effort: EFFORT_LEVEL,
					quality,
				});
				actualFormatUsed = "avif";
			}

			break;
		case "jpg":
			processedSharpInstance = baseSharpInstance.jpeg({
				mozjpeg: true,
				quality,
			});
			actualFormatUsed = "jpeg";
			break;

		case "webp":
			processedSharpInstance = baseSharpInstance.webp({
				effort: EFFORT_LEVEL,
				nearLossless: true,
				quality,
				smartSubsample: true,
			});
			actualFormatUsed = "webp";
			break;
		case "avif":
			processedSharpInstance = baseSharpInstance.avif({
				effort: EFFORT_LEVEL,
				quality,
			});
			actualFormatUsed = "avif";
			break;

		default:
			return Result.err(
				wrapErrorMessage(`Didn't account for the format, ${format}, didya?`),
			);
	}

	const convertedImageBuffer = await processedSharpInstance.toBuffer();

	const smallerImageBuffer =
		convertedImageBuffer.byteLength <= srcImg.byteLength
			? convertedImageBuffer
			: srcImg;

	return Result.ok([
		new Uint8Array(smallerImageBuffer),
		smallerImageBuffer.byteLength === srcImg.byteLength
			? srcMimeType || `image/${actualFormatUsed}`
			: `image/${actualFormatUsed}`,
	]);
};

/** Safer since it's wasm-based but doesn't support preserving animations */
const compressImageUsingWasmImageOptimizer: ImageCompressorHandler = async ({
	format,
	quality,
	srcImg,
	srcMimeType,
}) =>
	wrapErrorProneCode(async () => {
		const { optimizeImage } = await import("wasm-image-optimization");

		const actualFormatUsed =
			format === "auto" ? "avif" : format === "jpg" ? "jpeg" : format;

		const compressedImageBuffer = await optimizeImage({
			format: actualFormatUsed,
			image: srcImg,
			quality: quality,
		});

		if (!compressedImageBuffer) throw "Wasm image optimization failed :(";

		const smallerImageBuffer =
			compressedImageBuffer.byteLength <= srcImg.byteLength
				? compressedImageBuffer
				: srcImg;

		return [
			new Uint8Array(smallerImageBuffer),
			smallerImageBuffer.byteLength === srcImg.byteLength
				? srcMimeType || `image/${actualFormatUsed}`
				: `image/${actualFormatUsed}`,
		];
	});

const compressImageUsingJsquashWebp: ImageCompressorHandler = async ({
	quality,
	srcImg,
	srcMimeType,
}) => {
	return wrapErrorProneCode(async () => {
		const { encode } = await import("@jsquash/webp");

		const compressedImageBuffer = await encode(srcImg, { quality });

		const smallerImageBuffer =
			compressedImageBuffer.byteLength <= srcImg.byteLength
				? compressedImageBuffer
				: srcImg;

		const res = [
			new Uint8Array(smallerImageBuffer),
			smallerImageBuffer.byteLength === srcImg.byteLength
				? srcMimeType
				: "image/webp",
		] as [Uint8Array, ImageMimeType];

		return res;
	});
};

const compressImage: ImageCompressorHandler = async (payload) => {
	// Cloudflare workers on the free tier have 10ms limit which is too small for most.
	// Used the raw env for dead code elimination
	if (process.env.DEPLOYMENT_PLATFORM === "cloudflare") {
		return Result.ok([new Uint8Array(payload.srcImg), payload.srcMimeType]);
		// return compressImageUsingJsquashWebp(payload);
	}

	try {
		return compressImageUsingSharp(payload);
	} catch (_e) {
		console.error(
			"Sharp couldn't compress the image with mimetype",
			payload.srcMimeType,
			"Falling back to wasm image optimizer",
		);

		return compressImageUsingWasmImageOptimizer(payload);
	}
};

interface CompressImageFromUrlProps {
	url: UrlSchema;
	format: ImageFormatSchema;
	preserveAnim: boolean;
	cookieStr?: string;
	quality: NumberBetween1and100Inclusively;
}

interface ResponseAndSavings {
	res: Response;
	bytesSaved: number;
}

export async function compressImagefromUrl({
	format,
	cookieStr,
	preserveAnim,
	quality,
	url,
}: CompressImageFromUrlProps): Promise<Result<ResponseAndSavings>> {
	const headers = getSpoofingFetchHeaders({
		cookieStr,
		url,
	});

	const fetchedUrlResponse = await fetch(url, {
		headers,
		signal: getFetchTimeoutSignal(3500),
	});

	const imgBuffer = await fetchedUrlResponse.arrayBuffer();

	const imgMimeType = getLikelyImageUrlMimeType(
		url,
		fetchedUrlResponse.headers.get("content-type"),
	);

	if (!imgMimeType) {
		console.error(
			"compressImagefromUrl - No valid mime type. Content-Type was:",
			fetchedUrlResponse.headers.get("content-type"),
		);
		return Result.err(
			wrapErrorMessage(`Url, "${url}", has no valid image mime type.`),
		);
	}

	if (imgMimeType === "image/svg+xml") {
		return Result.err(
			wrapErrorMessage(
				`Url, "${url}", is an svg. Raster compression will negate it's benefit.`,
			),
		);
	}

	const compressionResult = await compressImage({
		format,
		preserveAnim,
		quality,
		srcImg: imgBuffer,
		srcMimeType: imgMimeType,
	});

	return compressionResult.map(([compressedImgBuffer, contentType]) => {
		const response = new Response(compressedImgBuffer, {
			headers: {
				"content-length": `${compressedImgBuffer.byteLength}`,
				"content-type": contentType,
				vary: "Accept",
			},
		});

		return {
			bytesSaved: Math.max(
				imgBuffer.byteLength - compressedImgBuffer.byteLength,
				0,
			),
			res: response,
		};
	});
}
