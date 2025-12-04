import * as v from "valibot";

/** https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/initiatorType */
export const PerformanceResourceTimingIntiatorTypeSchema = v.picklist([
	"audio",
	"beacon",
	"body",
	"css",
	"early-hint",
	"embed",
	"fetch",
	"frame",
	"iframe",
	"icon",
	"image",
	"img",
	"input",
	"link",
	"navigation",
	"object",
	"ping",
	"script",
	"track",
	"video",
	"xmlhttprequest",
	"other",
]);
export type PerformanceResourceTimingIntiatorTypeSchema = v.InferOutput<
	typeof PerformanceResourceTimingIntiatorTypeSchema
>;
