import * as v from "valibot";
import { NumberBetween1and100Inclusively, UrlSchema } from "./shared";

/** Every image compression adapter must return a url that when fetched, returns the compressed image. */
export type ImageCompressionAdapter = (
	originalUrl: string | URL,
	quality?: number,
) => Promise<UrlSchema | null>;

export const ProxyImageCompressionPayloadSchema = v.object({
	quality: v.optional(v.pipe(v.string(), v.transform(Number), NumberBetween1and100Inclusively)),
	url: UrlSchema,
});
export type ProxyImageCompressionPayloadSchema = v.InferOutput<
	typeof ProxyImageCompressionPayloadSchema
>;
