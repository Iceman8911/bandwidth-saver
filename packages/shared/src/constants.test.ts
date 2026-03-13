import { describe, expect, test } from "bun:test";
import {
	IMAGE_COMPRESSOR_ENDPOINT_SET,
	ImageCompressorEndpoint,
	ProxyCustomHeaders,
	URL_EXTENSION_REGEX,
} from "./constants";

describe("constants", () => {
	test("IMAGE_COMPRESSOR_ENDPOINT_SET contains all ImageCompressorEndpoint values", () => {
		const values = Object.values(ImageCompressorEndpoint);

		for (const value of values) {
			expect(IMAGE_COMPRESSOR_ENDPOINT_SET.has(value)).toBe(true);
		}
	});

	test("ProxyCustomHeaders values are lowercase (runtime check)", () => {
		for (const value of Object.values(ProxyCustomHeaders)) {
			expect(value.toLowerCase()).toBe(value);
		}
	});

	describe("URL_EXTENSION_REGEX", () => {
		test("matches file extension at end of url or before query/hash", () => {
			expect("https://a.com/img.png".match(URL_EXTENSION_REGEX)).toEqual([
				"png",
			]);

			expect("https://a.com/img.jpeg?x=1".match(URL_EXTENSION_REGEX)).toEqual([
				"jpeg",
			]);

			expect("https://a.com/img.svg#frag".match(URL_EXTENSION_REGEX)).toEqual([
				"svg",
			]);
		});

		test("does not match extensions that only appear inside query string/hash", () => {
			expect(
				"https://a.com/route?file=img.png".match(URL_EXTENSION_REGEX),
			).toBeNull();

			expect(
				"https://a.com/route#img.jpg".match(URL_EXTENSION_REGEX),
			).toBeNull();
		});

		test("handles multiple dots by matching the last extension segment", () => {
			expect("https://a.com/archive.tar.gz".match(URL_EXTENSION_REGEX)).toEqual(
				["gz"],
			);
		});

		test("does not match when no extension exists", () => {
			expect("https://a.com/noext".match(URL_EXTENSION_REGEX)).toBeNull();
			expect("https://a.com/noext?x=1".match(URL_EXTENSION_REGEX)).toBeNull();
		});
	});
});
