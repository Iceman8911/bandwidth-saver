import * as v from "valibot";
import { NumberBetween1and100Inclusively, UrlSchema } from "./shared";

export const ImageFormatSchema = v.picklist(["auto", "webp", "avif", "jpg"]);
export type ImageFormatSchema = v.InferOutput<typeof ImageFormatSchema>;

/** losse object is used dueo to some funky query string behaviour and as such, the extra props this object might have are necessary for restoring the redirected url. */
export const ImageCompressionPayloadSchema = v.looseObject({
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
	url: v.union([
		UrlSchema,
		// For some reason, some image urls with commas get split into an array, so this normalizes them
		v.pipe(
			v.array(v.string()),
			v.transform((arr) => arr.join(",")),
			UrlSchema,
		),
	]),
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
