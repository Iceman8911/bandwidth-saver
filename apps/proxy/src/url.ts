import type {
	ImageCompressionPayloadSchema,
	UrlSchema,
} from "@bandwidth-saver/shared";

const RAW_URL_SPLITTER =
	"zz_url_bwsvr8911=" satisfies `${keyof typeof ImageCompressionPayloadSchema.entries}=`;

/**
 * Funny things happen with nested url + query strings within another url+query string, so just split the original raw url and believe the second element is the url :D
 */
export function cleanlyExtractImageUrlFromRawRequestUrl(
	rawUrl: string,
): UrlSchema {
	const idx = rawUrl.indexOf(RAW_URL_SPLITTER);
	if (idx === -1) {
		throw new Error(`Missing ${RAW_URL_SPLITTER} query param.`);
	}

	const encoded = rawUrl.slice(idx + RAW_URL_SPLITTER.length);
	if (!encoded) {
		throw new Error(`Empty ${RAW_URL_SPLITTER} query param.`);
	}

	return decodeURIComponent(encoded) as UrlSchema;
}
