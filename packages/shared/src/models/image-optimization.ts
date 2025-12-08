import * as v from "valibot";
import { NumberBetween1and100Inclusively, UrlSchema } from "./shared";

export const ImageFormatSchema = v.picklist(["auto", "webp", "avif", "jpg"]);
export type ImageFormatSchema = v.InferOutput<typeof ImageFormatSchema>;

export const ImageCompressionPayloadSchema = v.object({
	/** An optional url to fallback to, or a number that tells the compressor endpoint what to do */
	default: v.optional(UrlSchema),
	format: v.optional(ImageFormatSchema, "auto"),
	/** If false, animated webp and gif assets will be reduced to their first frame.
	 *
	 * May be ignored by an implementation
	 */
	preserveAnim: v.pipe(
		v.string(),
		v.transform((input) => Boolean(input)),
	),
	quality: v.pipe(
		v.string(),
		v.transform(Number),
		NumberBetween1and100Inclusively,
	),
	url: UrlSchema,
});
export type ImageCompressionPayloadSchema = v.InferOutput<
	typeof ImageCompressionPayloadSchema
>;

/** Simply constructs a url to the compression service for possible compression */
export type ImageCompressionUrlConstructor = (
	payload: ImageCompressionPayloadSchema,
) => UrlSchema;

/** Validates the url provided by `ImageCompressionUrlConstructor` so that only a valid url or null is returned */
export type ImageCompressionAdapter = (
	payload: ImageCompressionPayloadSchema,
	urlConstructor: ImageCompressionUrlConstructor,
) => Promise<UrlSchema | null>;
