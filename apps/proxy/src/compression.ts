import {
	getFetchTimeoutSignal,
	getLikelyImageUrlMimeType,
	type ImageFormatSchema,
	type ImageMimeType,
	type NumberBetween1and100Inclusively,
	SPOOFING_FETCH_HEADERS,
	type UrlSchema,
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
) => Promise<[Uint8Array, ImageMimeType]>;

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

const compressImage: ImageCompressorHandler = async (payload) => {
	// Cloudflare workers on the free tier have 10ms limit which is too small to do any meaningful compression.
	// Used the raw env for dead code elimination
	if (process.env.DEPLOYMENT_PLATFORM === "cloudflare") {
		return [new Uint8Array(payload.srcImg), payload.srcMimeType];
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

interface CompressImageFromUrlProps {
	url: UrlSchema;
	format: ImageFormatSchema;
	preserveAnim: boolean;
	quality: NumberBetween1and100Inclusively;
}

interface ResponseAndSavings {
	res: Response;
	bytesSaved: number;
}

export async function compressImagefromUrl({
	format,
	preserveAnim,
	quality,
	url,
}: CompressImageFromUrlProps): Promise<ResponseAndSavings> {
	const fetchedUrlResponse = await fetch(url, {
		headers: SPOOFING_FETCH_HEADERS,
		signal: getFetchTimeoutSignal(),
	});

	const imgBuffer = await fetchedUrlResponse.arrayBuffer();
	const imgMimeType = getLikelyImageUrlMimeType(
		url,
		fetchedUrlResponse.headers.get("content-type"),
	);

	if (!imgMimeType) throw Error(`Url, "${url}", has no valid image mime type.`);

	const [compressedImgBuffer, contentType] = await compressImage({
		format,
		preserveAnim,
		quality,
		srcImg: imgBuffer,
		srcMimeType: imgMimeType,
	});

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
}
