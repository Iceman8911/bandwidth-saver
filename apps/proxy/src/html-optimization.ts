import {
	getFetchTimeoutSignal,
	SPOOFING_FETCH_HEADERS,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import { minify } from "@cf-wasm/minify-html";
import { TEXT_DECODER, TEXT_ENCODER } from "./shared";
import { compressTextBuffer } from "./utils/text-compression";

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
	/** Rough estimate for perf reasons */
	bytesSaved: number;
	/** The minified size (or  original size if the minfication actually made it larger) */
	size: number;
	html: Uint8Array<ArrayBufferLike>;
	mode: "gzip" | "zstd";
}

export async function minifyHtmlString(
	originalHtmlString: string,
	mayUseZstd: boolean,
): Promise<MinifiedHtmlOutput> {
	// Too many Wsam Instantiate issues with the workerd version :/
	// const { minify } =
	// 	// To allow dead code elimination
	// 	process.env.DEPLOYMENT_PLATFORM === "cloudflare"
	// 		? await import("@cf-wasm/minify-html/workerd")
	// 		: await import("@cf-wasm/minify-html/node");

	const originalHtmlBuffer = TEXT_ENCODER.encode(originalHtmlString);
	const minifiedHtmlBuffer = minify(originalHtmlBuffer, {
		allow_noncompliant_unquoted_attribute_values: true,
		allow_optimal_entities: true,
		allow_removing_spaces_between_attributes: true,
		minify_css: true,
		minify_js: true,
	});
	const originalHtmlBufferLength = originalHtmlBuffer.byteLength;
	const minifiedHtmlBufferLength = minifiedHtmlBuffer.byteLength;
	const uncompressedBytesSaved =
		originalHtmlBufferLength - minifiedHtmlBufferLength;
	const didMinifyWell = uncompressedBytesSaved > 0;
	const uncompressedHtmlBuffer = new Uint8Array(
		didMinifyWell ? minifiedHtmlBuffer : originalHtmlBuffer,
	);
	const { buffer: compressedHtmlBuffer, mode } = await compressTextBuffer({
		mayUseZstd,
		src: uncompressedHtmlBuffer,
	});
	const compressedHtmlBufferLength = compressedHtmlBuffer.byteLength;

	return {
		// This is a somewhat rough estimate since I don't really want to waste resources by compressing the original buffer :p
		bytesSaved: Math.round(
			uncompressedBytesSaved *
				(compressedHtmlBufferLength / uncompressedHtmlBuffer.byteLength),
		),
		html: compressedHtmlBuffer,
		mode,
		size: compressedHtmlBufferLength,
	};
}
