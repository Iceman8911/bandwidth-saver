import type { UrlSchema } from "@bandwidth-saver/shared";
import { describe, expect, it } from "vitest";
import {
	detectAssetTypeFromUrl,
	getUrlIdsFromOrigin,
	getUrlSchemaHost,
	getUrlSchemaOrigin,
	isExtensionUrl,
} from "./url";

describe("detectAssetTypeFromUrl", () => {
	it("returns 'other' when no extension is present", () => {
		expect(detectAssetTypeFromUrl("https://example.com" as UrlSchema)).toBe(
			"other",
		);
		expect(detectAssetTypeFromUrl("https://example.com/" as UrlSchema)).toBe(
			"other",
		);
		expect(
			detectAssetTypeFromUrl("https://example.com/path" as UrlSchema),
		).toBe("other");
	});

	it("detects image types from common extensions", () => {
		expect(detectAssetTypeFromUrl("https://a.test/img.png" as UrlSchema)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.jpg" as UrlSchema)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.jpeg" as UrlSchema)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.webp" as UrlSchema)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.gif" as UrlSchema)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.svg" as UrlSchema)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.ico" as UrlSchema)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.avif" as UrlSchema)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.jxl" as UrlSchema)).toBe(
			"image",
		);
	});

	it("detects style/script/html/font/video/audio by extension", () => {
		expect(
			detectAssetTypeFromUrl("https://a.test/styles.css" as UrlSchema),
		).toBe("style");

		expect(detectAssetTypeFromUrl("https://a.test/app.js" as UrlSchema)).toBe(
			"script",
		);
		expect(detectAssetTypeFromUrl("https://a.test/app.mjs" as UrlSchema)).toBe(
			"script",
		);
		expect(detectAssetTypeFromUrl("https://a.test/app.cjs" as UrlSchema)).toBe(
			"script",
		);
		expect(detectAssetTypeFromUrl("https://a.test/app.wasm" as UrlSchema)).toBe(
			"script",
		);

		expect(
			detectAssetTypeFromUrl("https://a.test/index.html" as UrlSchema),
		).toBe("html");
		expect(
			detectAssetTypeFromUrl("https://a.test/index.htm" as UrlSchema),
		).toBe("html");

		expect(
			detectAssetTypeFromUrl("https://a.test/font.woff" as UrlSchema),
		).toBe("font");
		expect(
			detectAssetTypeFromUrl("https://a.test/font.woff2" as UrlSchema),
		).toBe("font");
		expect(detectAssetTypeFromUrl("https://a.test/font.ttf" as UrlSchema)).toBe(
			"font",
		);
		expect(detectAssetTypeFromUrl("https://a.test/font.otf" as UrlSchema)).toBe(
			"font",
		);
		expect(detectAssetTypeFromUrl("https://a.test/font.eot" as UrlSchema)).toBe(
			"font",
		);

		expect(detectAssetTypeFromUrl("https://a.test/vid.mp4" as UrlSchema)).toBe(
			"video",
		);
		expect(detectAssetTypeFromUrl("https://a.test/vid.webm" as UrlSchema)).toBe(
			"video",
		);
		expect(detectAssetTypeFromUrl("https://a.test/vid.mov" as UrlSchema)).toBe(
			"video",
		);
		expect(detectAssetTypeFromUrl("https://a.test/vid.mkv" as UrlSchema)).toBe(
			"video",
		);

		expect(
			detectAssetTypeFromUrl("https://a.test/audio.mp3" as UrlSchema),
		).toBe("audio");
		expect(
			detectAssetTypeFromUrl("https://a.test/audio.wav" as UrlSchema),
		).toBe("audio");
		expect(
			detectAssetTypeFromUrl("https://a.test/audio.flac" as UrlSchema),
		).toBe("audio");
		expect(
			detectAssetTypeFromUrl("https://a.test/audio.aac" as UrlSchema),
		).toBe("audio");
		expect(
			detectAssetTypeFromUrl("https://a.test/audio.ogg" as UrlSchema),
		).toBe("audio");
	});

	it("handles query string and hash fragments (extension should still be detected)", () => {
		expect(
			detectAssetTypeFromUrl("https://a.test/img.png?size=2" as UrlSchema),
		).toBe("image");
		expect(
			detectAssetTypeFromUrl("https://a.test/app.js#v=123" as UrlSchema),
		).toBe("script");
		expect(
			detectAssetTypeFromUrl("https://a.test/styles.css?x=1#y=2" as UrlSchema),
		).toBe("style");
	});

	it("returns 'other' for unknown extensions", () => {
		expect(detectAssetTypeFromUrl("https://a.test/file.xyz" as UrlSchema)).toBe(
			"other",
		);
	});

	it("uses the last extension-like suffix for multi-dot paths", () => {
		expect(
			detectAssetTypeFromUrl("https://a.test/app.min.js" as UrlSchema),
		).toBe("script");
		expect(
			detectAssetTypeFromUrl("https://a.test/archive.tar.gz" as UrlSchema),
		).toBe("other");
	});
});

describe("getUrlSchemaOrigin", () => {
	it("extracts scheme + host origin for a normal URL", () => {
		expect(
			getUrlSchemaOrigin("https://example.com/path?q=1" as UrlSchema),
		).toBe("https://example.com");
		expect(getUrlSchemaOrigin("http://example.com/abc" as UrlSchema)).toBe(
			"http://example.com",
		);
		expect(
			getUrlSchemaOrigin("https://sub.example.com:8443/a" as UrlSchema),
		).toBe("https://sub.example.com:8443");
	});

	it("returns a dummy tab url fallback if it cannot match an origin-like prefix", () => {
		// We don't assert the exact dummy URL string here to keep the test intentful and stable.
		const origin = getUrlSchemaOrigin("not a url" as UrlSchema);
		expect(typeof origin).toBe("string");
		expect(origin.length).toBeGreaterThan(0);
	});
});

describe("getUrlSchemaHost", () => {
	it("extracts the host from a URL with a scheme", () => {
		expect(getUrlSchemaHost("https://example.com/path")).toBe("example.com");
		expect(getUrlSchemaHost("http://sub.example.com:8080/foo")).toBe(
			"sub.example.com",
		);
	});

	it("extracts the host from a schemeless URL-like string", () => {
		expect(getUrlSchemaHost("example.com/path")).toBe("example.com");
		expect(getUrlSchemaHost("sub.example.com:1234/a/b")).toBe(
			"sub.example.com",
		);
	});

	it("throws if it cannot extract a host", () => {
		expect(() => getUrlSchemaHost("")).toThrow();
		expect(() => getUrlSchemaHost("///")).toThrow();
	});
});

describe("isExtensionUrl", () => {
	it("returns true for extension scheme urls", () => {
		expect(
			isExtensionUrl("chrome-extension://abc/index.html" as UrlSchema),
		).toBe(true);
		expect(isExtensionUrl("moz-extension://abc/index.html" as UrlSchema)).toBe(
			true,
		);
		expect(isExtensionUrl("extension://abc/index.html" as UrlSchema)).toBe(
			true,
		);
	});

	it("returns false for normal http(s) urls", () => {
		expect(isExtensionUrl("https://example.com" as UrlSchema)).toBe(false);
		expect(isExtensionUrl("http://example.com" as UrlSchema)).toBe(false);
	});
});

describe("getUrlIdsFromOrigin", () => {
	it("returns stable ids for the same origin across calls", () => {
		const origin = "https://example.com" as UrlSchema;

		const a = getUrlIdsFromOrigin(origin);
		const b = getUrlIdsFromOrigin(origin);

		expect(b).toEqual(a);
	});

	it("returns the same object reference for repeated calls (cache hit)", () => {
		const origin = "https://example.com" as UrlSchema;

		const a = getUrlIdsFromOrigin(origin);
		const b = getUrlIdsFromOrigin(origin);

		// Intent: ensure caching is actually happening (not just deterministic recompute).
		expect(b).toBe(a);
	});

	it("returns different ids for different origins", () => {
		const a = getUrlIdsFromOrigin("https://example.com" as UrlSchema);
		const b = getUrlIdsFromOrigin("https://example.org" as UrlSchema);

		expect(b).not.toEqual(a);
	});

	it("produces the expected payload shape and numeric properties", () => {
		const ids = getUrlIdsFromOrigin("https://example.com" as UrlSchema);

		expect(ids).toEqual({
			assetExtBlock: expect.any(Number),
			assetTypeBlock: expect.any(Number),
			cacheHtmlBetter: expect.any(Number),
			compression: expect.any(Number),
			cspBlock: expect.any(Number),
			saveData: expect.any(Number),
		});

		for (const value of Object.values(ids)) {
			expect(Number.isFinite(value)).toBe(true);
			expect(Number.isInteger(value)).toBe(true);
			expect(value).toBeGreaterThanOrEqual(1);
			expect(value).toBeLessThanOrEqual(0x7fffffff);
		}
	});
});
