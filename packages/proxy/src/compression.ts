import type { ImageCompressionPayloadSchema } from "@bandwidth-saver/shared";
import sharp from "sharp";

export async function compressImage(
	imageBuffer: ArrayBuffer,
	{
		format_bwsvr8911: format,
		preserveAnim_bwsvr8911: preserveAnim,
		quality_bwsvr8911: quality,
	}: ImageCompressionPayloadSchema,
): Promise<[Uint8Array, `image/${typeof formatToUse}`]> {
	const formatToUse =
		format === "auto" ? "avif" : format === "jpg" ? "jpeg" : format;

	return sharp(imageBuffer, { animated: preserveAnim })
		[formatToUse]({ quality })
		.toBuffer()
		.then((buffer) => [buffer, `image/${formatToUse}`]);
}
