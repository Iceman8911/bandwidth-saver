import { Result } from "@badrap/result";
import {
	type ImageCompressionPayloadOutput,
	type UrlOutput,
	wrapErrorMessage,
} from "@bandwidth-saver/shared";

const RAW_URL_SPLITTER =
	"zz_url_bwsvr8911=" satisfies `${keyof typeof ImageCompressionPayloadOutput.entries}=`;

const COLUMN_AND_COMMA_MATCHER = /(?<=https?:\/\/.*):|,/g;
function columnAndCommaReplacer(subStringMatched: string) {
	return subStringMatched === ":" ? "%3A" : "%2C";
}

/**
 * Funny things happen with nested url + query strings within another url+query string, so just split the original raw url and believe the second element is the url :D
 */
export function cleanlyExtractNestedUrlFromRawRequestUrl(
	rawUrl: string,
): Result<UrlOutput> {
	const idx = rawUrl.indexOf(RAW_URL_SPLITTER);
	if (idx === -1) {
		return Result.err(
			wrapErrorMessage(`Missing ${RAW_URL_SPLITTER} query param.`),
		);
	}

	const encoded = rawUrl.slice(idx + RAW_URL_SPLITTER.length);
	if (!encoded) {
		return Result.err(
			wrapErrorMessage(`Empty ${RAW_URL_SPLITTER} query param.`),
		);
	}

	const decoded = decodeURIComponent(encoded);

	// "," and ":" need to be manually encoded (since I can't do that via DNR from the extension side), otherwise, urls that use them within the url end up failing
	return Result.ok(
		decoded.replace(
			COLUMN_AND_COMMA_MATCHER,
			columnAndCommaReplacer,
		) as UrlOutput,
	);
}
