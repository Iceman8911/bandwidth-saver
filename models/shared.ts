import * as v from "valibot";

export const NumberBetween1and100Inclusively = v.pipe(
	v.number(),
	v.toMinValue(1),
	v.toMaxValue(100),
);
export type NumberBetween1and100Inclusively = v.InferOutput<
	typeof NumberBetween1and100Inclusively
>;
