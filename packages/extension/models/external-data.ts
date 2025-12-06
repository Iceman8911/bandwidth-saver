import * as v from "valibot";

export const CompressionWhitelistedDomainSchema = v.object({
	domains: v.array(v.string()),
	version: v.number(),
});
export type CompressionWhitelistedDomainSchema = v.InferOutput<
	typeof CompressionWhitelistedDomainSchema
>;
