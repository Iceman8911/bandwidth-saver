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

export const DataUrlSchema = v.pipe(
	v.string(),
	v.regex(/^data:[^;]*;base64,/),
	v.brand("dataUrl"),
);

export type DataUrlSchema = v.InferOutput<typeof DataUrlSchema>;
