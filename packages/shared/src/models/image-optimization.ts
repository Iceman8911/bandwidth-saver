import * as v from "valibot";
import { NumberBetween1and100Inclusively, UrlSchema } from "./shared";

export const ImageFormatSchema = v.picklist(["auto", "webp", "avif", "jpg"])
export type ImageFormatSchema = v.InferOutput<typeof ImageFormatSchema>

export const ImageCompressionPayloadSchema = v.object({
	quality: v.pipe(v.string(), v.transform(Number), NumberBetween1and100Inclusively),
	url: UrlSchema,
	/** If false, animated webp and gif assets will be reduced to their first frame */
	preserveAnim: v.boolean(),
	format: v.optional(ImageFormatSchema, "auto")
});
export type ImageCompressionPayloadSchema = v.InferOutput<
	typeof ImageCompressionPayloadSchema
>;


/** Every image compression adapter must return a url that when fetched, returns the compressed image. */
export type ImageCompressionAdapter = (arg: ImageCompressionPayloadSchema) => Promise<UrlSchema | null>;
