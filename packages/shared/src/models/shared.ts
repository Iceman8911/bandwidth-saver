import * as v from "valibot";

export const NumberBetween1and100Inclusively = v.pipe(
	v.number(),
	v.toMinValue(1),
	v.toMaxValue(100),
);
export type NumberBetween1and100InclusivelyInput = v.InferInput<
	typeof NumberBetween1and100Inclusively
>;
export type NumberBetween1and100InclusivelyOutput = v.InferOutput<
	typeof NumberBetween1and100Inclusively
>;

export const UrlSchema = v.pipe(v.string(), v.url(), v.brand("url"));
export type UrlInput = v.InferInput<typeof UrlSchema>;
export type UrlOutput = v.InferOutput<typeof UrlSchema>;

export const DataUrlSchema = v.pipe(
	v.string(),
	v.regex(/^data:[^;]*;base64,/),
	v.brand("dataUrl"),
);

export type DataUrlInput = v.InferInput<typeof DataUrlSchema>;
export type DataUrlOutput = v.InferOutput<typeof DataUrlSchema>;

export type AnyValibotSchema = v.BaseSchema<
	unknown,
	unknown,
	v.BaseIssue<unknown>
>;

export const NormalizedUrlSchema = v.union([
	UrlSchema,
	// For some reason, some image urls with commas get split into an array, so this normalizes them
	v.pipe(
		v.array(v.string()),
		v.transform((arr) => arr.join(",")),
		UrlSchema,
	),
]);
export type NormalizedUrlInput = v.InferInput<typeof NormalizedUrlSchema>;
export type NormalizedUrlOutput = v.InferOutput<typeof NormalizedUrlSchema>;
