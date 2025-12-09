import type { ImageCompressionPayloadSchema } from "@bandwidth-saver/shared";
import sharp from "sharp";

export async function compressImage(
	imageBuffer: ArrayBuffer,
	{ format, preserveAnim, quality }: ImageCompressionPayloadSchema,
): Promise<Uint8Array> {
	const formatToUse =
		format === "auto" ? "avif" : format === "jpg" ? "jpeg" : format;

	return sharp(imageBuffer, { animated: preserveAnim })
		[formatToUse]({ quality })
		.toBuffer();
}
