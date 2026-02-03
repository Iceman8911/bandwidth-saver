import {
	getProxyEnv,
	type ImageFormatSchema,
	type NumberBetween1and100Inclusively,
} from "@bandwidth-saver/shared";
import type { Sharp } from "sharp";

const { DEPLOYMENT_PLATFORM } = getProxyEnv();

const EFFORT_LEVEL = 6;

interface ImageCompressorHandlerPayload {
	format: ImageFormatSchema;
	preserveAnim: boolean;
	quality: NumberBetween1and100Inclusively;
	srcImg: ArrayBuffer;
	srcMimeType: string | undefined | null;
}

type ImageCompressorHandler = (
	payload: ImageCompressorHandlerPayload,
) => Promise<[Uint8Array, mimeType: string]>;

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
					quality: quality * 0.85,
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
			throw `Didn't account for the format, ${format}, didya?`;
	}

	const convertedImageBuffer = await processedSharpInstance.toBuffer();

	const smallerImageBuffer =
		convertedImageBuffer.byteLength <= srcImg.byteLength
			? convertedImageBuffer
			: srcImg;

	return [
		new Uint8Array(smallerImageBuffer),
		smallerImageBuffer.byteLength === srcImg.byteLength
			? srcMimeType || `image/${actualFormatUsed}`
			: `image/${actualFormatUsed}`,
	];
};

/** Safer since it's wasm-based but doesn't support preserving animations */
const compressImageUsingWasmImageOptimizer: ImageCompressorHandler = async ({
	format,
	quality,
	srcImg,
	srcMimeType,
}) => {
	const { optimizeImage } = await import("wasm-image-optimization");

	const actualFormatUsed =
		format === "auto" ? "avif" : format === "jpg" ? "jpeg" : format;

	const compressedImageBuffer = await optimizeImage({
		format: actualFormatUsed,
		image: srcImg,
		quality: quality,
	});

	if (!compressedImageBuffer) throw Error("Wasm image optimization failed :(");

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
};

export const compressImage: ImageCompressorHandler = async (payload) => {
	// On cloudflare, sharp outright fails regardless
	if (DEPLOYMENT_PLATFORM === "cloudflare") {
		return compressImageUsingWasmImageOptimizer(payload);
	}

	try {
		return compressImageUsingSharp(payload);
	} catch (e) {
		console.error(
			"Sharp couldn't compress the image with mimetype",
			payload.srcMimeType,
			"Falling back to wasm image optimizer",
		);

		return compressImageUsingWasmImageOptimizer(payload);
	}
};
