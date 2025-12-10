import {
	ImageCompressionPayloadSchema,
	UrlSchema,
} from "@bandwidth-saver/shared";
import * as v from "valibot";

/** Using `new URL()` to get the search params of a url string with a searchy query containing another url (that also has a query string) is wonky; in the sense that the latter url will only be extracted with the first query from its original string. */
export function cleanlyExtractUrlFromImageCompressorPayload(
	query: ImageCompressionPayloadSchema,
): UrlSchema {
	const extraQueryStringPairs = Object.entries(query).filter(
		([key]) => !(key in ImageCompressionPayloadSchema.entries),
	);

	const starvedUrl = new URL(query.url_bwsvr8911);

	for (const [key, val] of extraQueryStringPairs) {
		starvedUrl.searchParams.append(key, String(val));
	}

	return v.parse(UrlSchema, decodeURIComponent(String(starvedUrl)));
}
