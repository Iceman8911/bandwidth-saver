import {
	getFetchTimeoutSignal,
	getProxyEnv,
	SPOOFING_FETCH_HEADERS,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import { TEXT_DECODER, TEXT_ENCODER } from "./shared";

const { DEPLOYMENT_PLATFORM } = getProxyEnv();

interface FetchedHtmlStringAndHeaders {
	html: string;
	headers: Headers;
}

export async function fetchHtmlText(
	url: UrlSchema,
): Promise<FetchedHtmlStringAndHeaders> {
	const res = await fetch(url, {
		headers: SPOOFING_FETCH_HEADERS,
		// signal: getFetchTimeoutSignal(),
	});

	return { headers: res.headers, html: await res.text() };
}

const CSP_META_TAG_REGEX =
	/<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi;

export function stripOutCspMetaTagsFromHtmlString(htmlString: string): string {
	return htmlString.replace(CSP_META_TAG_REGEX, "");
}

interface MinifiedHtmlOutput {
	bytesSaved: number;
	/** The minified size (or  original size if the minfication actually made it larger) */
	size: number;
	html: string;
}

export async function minifyHtmlString(
	originalHtmlString: string,
): Promise<MinifiedHtmlOutput> {
	// Too many Wsam Instantiate issues with the workerd version :/
	// const { minify } =
	// 	// To allow dead code elimination
	// 	process.env.DEPLOYMENT_PLATFORM === "cloudflare"
	// 		? await import("@cf-wasm/minify-html/workerd")
	// 		: await import("@cf-wasm/minify-html/node");
	const { minify } = await import("@cf-wasm/minify-html");

	const originalHtmlBuffer = TEXT_ENCODER.encode(originalHtmlString);
	const minifiedHtmlBuffer = await minify.async(originalHtmlBuffer, {
		allow_noncompliant_unquoted_attribute_values: true,
		allow_optimal_entities: true,
		allow_removing_spaces_between_attributes: true,
		minify_css: true,
		minify_js: true,
	});
	const originalHtmlBufferLength = originalHtmlBuffer.byteLength;
	const minifiedHtmlBufferLength = minifiedHtmlBuffer.byteLength;
	const bytesSaved = originalHtmlBufferLength - minifiedHtmlBufferLength;
	const didMinifyWell = bytesSaved > 0;

	return {
		bytesSaved,
		html: didMinifyWell
			? TEXT_DECODER.decode(minifiedHtmlBuffer)
			: originalHtmlString,
		size: didMinifyWell ? minifiedHtmlBufferLength : originalHtmlBufferLength,
	};
}
