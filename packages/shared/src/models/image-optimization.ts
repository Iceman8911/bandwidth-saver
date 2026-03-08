import * as v from "valibot";
import {
	NormalizedUrlSchema,
	NumberBetween1and100Inclusively,
	UrlSchema,
} from "./shared";

export const ImageFormatSchema = v.picklist(["auto", "webp", "avif", "jpg"]);
export type ImageFormatSchema = v.InferOutput<typeof ImageFormatSchema>;

const CoercedToBooleanOptionalSchema = v.optional(
	v.union([
		v.boolean(),
		v.pipe(v.string(), v.transform(JSON.parse), v.toBoolean()),
	]),
);

/** loose object is used due to some funky query string behaviour and as such, the extra props this object might have are necessary for restoring the redirected url. */
export const ImageCompressionPayloadSchema = v.looseObject({
	/** Backup remote proxies that host this same code.
	 *
	 * Like a speedy cloudflare worker that'd optionally fallback to a more "hefty" one for raw image compression
	 */
	backupEndpoints_bwsvr8911: v.optional(
		v.union([
			v.pipe(v.string(), v.transform(JSON.parse), v.array(UrlSchema)),
			v.array(UrlSchema),
		]),
	),

	/** Optional cloudinary cloud name like `ddwdeqdas` so cloudinary can be used */
	cloudinary_bwsvr8911: v.optional(v.string()),

	/** An optional url to fallback to, or a number that tells the compressor endpoint what to do */
	default_bwsvr8911: v.optional(UrlSchema),

	/** If `true`, the proxy will try to do the image transformations itself.
	 *
	 * If `false`, the proxy will first try public transformation endpoints, before falling back to a manual compress.
	 */
	forceManual_bwsvr8911: CoercedToBooleanOptionalSchema,

	format_bwsvr8911: v.optional(ImageFormatSchema, "auto"),

	/** If false, animated webp and gif assets will be reduced to their first frame.
	 *
	 * May be ignored by an implementation
	 */
	preserveAnim_bwsvr8911: CoercedToBooleanOptionalSchema,

	quality_bwsvr8911: v.pipe(
		v.string(),
		v.toNumber(),
		NumberBetween1and100Inclusively,
	),
	/** Ensure that this is at the end, alphabetically, so I can do a simple regex match to get the url in one sweep */
	zz_url_bwsvr8911: NormalizedUrlSchema,
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
