import * as v from "valibot";

export const NumberBetween1and100Inclusively = v.pipe(
	v.number(),
	v.toMinValue(1),
	v.toMaxValue(100),
);
export type NumberBetween1and100Inclusively = v.InferOutput<
	typeof NumberBetween1and100Inclusively
>;

export const UrlSchema = v.pipe(v.string(), v.url(), v.brand("url"));
export type UrlSchema = v.InferOutput<typeof UrlSchema>;

export const Base64Schema = v.pipe(v.string(), v.base64(), v.brand("base64"));
export type Base64Schema = v.InferOutput<typeof Base64Schema>;
