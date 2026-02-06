import * as v from "valibot";
import { NormalizedUrlSchema } from "./shared";

export const HtmlOptimizationPayloadSchema = v.looseObject({
	stripCspMetaTag_bwsvr8911: v.pipe(v.string(), v.toBoolean()),
	zz_url_bwsvr8911: NormalizedUrlSchema,
});
export type HtmlOptimizationPayloadSchema = v.InferOutput<
	typeof HtmlOptimizationPayloadSchema
>;
