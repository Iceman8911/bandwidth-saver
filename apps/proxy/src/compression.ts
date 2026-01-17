import type { ImageCompressionPayloadSchema } from "@bandwidth-saver/shared";
import sharp, { type Sharp } from "sharp";

const EFFORT_LEVEL = 6;

export async function compressImage(
	originalImageBuffer: ArrayBuffer,
	originalMimeType: string | undefined | null,
	{
		format_bwsvr8911: conversionFormat,
		preserveAnim_bwsvr8911: preserveAnim,
		quality_bwsvr8911: quality,
	}: ImageCompressionPayloadSchema,
): Promise<[Uint8Array, string]> {
	const baseSharpInstance = sharp(originalImageBuffer, {
		animated: preserveAnim,
	});

	const {
		hasAlpha,
		format: sharpFormat,
		isProgressive,
	} = await baseSharpInstance.metadata();

	let processedSharpInstance: Sharp;
	let actualFormatUsed = sharpFormat;

	switch (conversionFormat) {
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
			throw `Didn't account for the format, ${conversionFormat}, didya?`;
	}

	const convertedImageBuffer = await processedSharpInstance.toBuffer();

	const smallerImageBuffer =
		convertedImageBuffer.byteLength <= originalImageBuffer.byteLength
			? convertedImageBuffer
			: originalImageBuffer;

	return [
		new Uint8Array(smallerImageBuffer),
		smallerImageBuffer.byteLength === originalImageBuffer.byteLength
			? originalMimeType || `image/${actualFormatUsed}`
			: `image/${actualFormatUsed}`,
	];
}
