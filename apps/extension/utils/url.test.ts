import type { UrlOutput } from "@bandwidth-saver/shared";
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
		expect(detectAssetTypeFromUrl("https://example.com" as UrlOutput)).toBe(
			"other",
		);
		expect(detectAssetTypeFromUrl("https://example.com/" as UrlOutput)).toBe(
			"other",
		);
		expect(
			detectAssetTypeFromUrl("https://example.com/path" as UrlOutput),
		).toBe("other");
	});

	it("detects image types from common extensions", () => {
		expect(detectAssetTypeFromUrl("https://a.test/img.png" as UrlOutput)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.jpg" as UrlOutput)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.jpeg" as UrlOutput)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.webp" as UrlOutput)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.gif" as UrlOutput)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.svg" as UrlOutput)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.ico" as UrlOutput)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.avif" as UrlOutput)).toBe(
			"image",
		);
		expect(detectAssetTypeFromUrl("https://a.test/img.jxl" as UrlOutput)).toBe(
			"image",
		);
	});

	it("detects style/script/html/font/video/audio by extension", () => {
		expect(
			detectAssetTypeFromUrl("https://a.test/styles.css" as UrlOutput),
		).toBe("style");

		expect(detectAssetTypeFromUrl("https://a.test/app.js" as UrlOutput)).toBe(
			"script",
		);
		expect(detectAssetTypeFromUrl("https://a.test/app.mjs" as UrlOutput)).toBe(
			"script",
		);
		expect(detectAssetTypeFromUrl("https://a.test/app.cjs" as UrlOutput)).toBe(
			"script",
		);
		expect(detectAssetTypeFromUrl("https://a.test/app.wasm" as UrlOutput)).toBe(
			"script",
		);

		expect(
			detectAssetTypeFromUrl("https://a.test/index.html" as UrlOutput),
		).toBe("html");
		expect(
			detectAssetTypeFromUrl("https://a.test/index.htm" as UrlOutput),
		).toBe("html");

		expect(
			detectAssetTypeFromUrl("https://a.test/font.woff" as UrlOutput),
		).toBe("font");
		expect(
			detectAssetTypeFromUrl("https://a.test/font.woff2" as UrlOutput),
		).toBe("font");
		expect(detectAssetTypeFromUrl("https://a.test/font.ttf" as UrlOutput)).toBe(
			"font",
		);
		expect(detectAssetTypeFromUrl("https://a.test/font.otf" as UrlOutput)).toBe(
			"font",
		);
		expect(detectAssetTypeFromUrl("https://a.test/font.eot" as UrlOutput)).toBe(
			"font",
		);

		expect(detectAssetTypeFromUrl("https://a.test/vid.mp4" as UrlOutput)).toBe(
			"video",
		);
		expect(detectAssetTypeFromUrl("https://a.test/vid.webm" as UrlOutput)).toBe(
			"video",
		);
		expect(detectAssetTypeFromUrl("https://a.test/vid.mov" as UrlOutput)).toBe(
			"video",
		);
		expect(detectAssetTypeFromUrl("https://a.test/vid.mkv" as UrlOutput)).toBe(
			"video",
		);

		expect(
			detectAssetTypeFromUrl("https://a.test/audio.mp3" as UrlOutput),
		).toBe("audio");
		expect(
			detectAssetTypeFromUrl("https://a.test/audio.wav" as UrlOutput),
		).toBe("audio");
		expect(
			detectAssetTypeFromUrl("https://a.test/audio.flac" as UrlOutput),
		).toBe("audio");
		expect(
			detectAssetTypeFromUrl("https://a.test/audio.aac" as UrlOutput),
		).toBe("audio");
		expect(
			detectAssetTypeFromUrl("https://a.test/audio.ogg" as UrlOutput),
		).toBe("audio");
	});

	it("handles query string and hash fragments (extension should still be detected)", () => {
		expect(
			detectAssetTypeFromUrl("https://a.test/img.png?size=2" as UrlOutput),
		).toBe("image");
		expect(
			detectAssetTypeFromUrl("https://a.test/app.js#v=123" as UrlOutput),
		).toBe("script");
		expect(
			detectAssetTypeFromUrl("https://a.test/styles.css?x=1#y=2" as UrlOutput),
		).toBe("style");
	});

	it("returns 'other' for unknown extensions", () => {
		expect(detectAssetTypeFromUrl("https://a.test/file.xyz" as UrlOutput)).toBe(
			"other",
		);
	});

	it("uses the last extension-like suffix for multi-dot paths", () => {
		expect(
			detectAssetTypeFromUrl("https://a.test/app.min.js" as UrlOutput),
		).toBe("script");
		expect(
			detectAssetTypeFromUrl("https://a.test/archive.tar.gz" as UrlOutput),
		).toBe("other");
	});
});

describe("getUrlSchemaOrigin", () => {
	it("extracts scheme + host origin for a normal URL", () => {
		expect(
			getUrlSchemaOrigin("https://example.com/path?q=1" as UrlOutput),
		).toBe("https://example.com");
		expect(getUrlSchemaOrigin("http://example.com/abc" as UrlOutput)).toBe(
			"http://example.com",
		);
		expect(
			getUrlSchemaOrigin("https://sub.example.com:8443/a" as UrlOutput),
		).toBe("https://sub.example.com:8443");
	});

	it("returns a dummy tab url fallback if it cannot match an origin-like prefix", () => {
		// We don't assert the exact dummy URL string here to keep the test intentful and stable.
		const origin = getUrlSchemaOrigin("not a url" as UrlOutput);
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
			isExtensionUrl("chrome-extension://abc/index.html" as UrlOutput),
		).toBe(true);
		expect(isExtensionUrl("moz-extension://abc/index.html" as UrlOutput)).toBe(
			true,
		);
		expect(isExtensionUrl("extension://abc/index.html" as UrlOutput)).toBe(
			true,
		);
	});

	it("returns false for normal http(s) urls", () => {
		expect(isExtensionUrl("https://example.com" as UrlOutput)).toBe(false);
		expect(isExtensionUrl("http://example.com" as UrlOutput)).toBe(false);
	});
});

describe("getUrlIdsFromOrigin", () => {
	it("returns stable ids for the same origin across calls", () => {
		const origin = "https://example.com" as UrlOutput;

		const a = getUrlIdsFromOrigin(origin);
		const b = getUrlIdsFromOrigin(origin);

		expect(b).toEqual(a);
	});

	it("returns the same object reference for repeated calls (cache hit)", () => {
		const origin = "https://example.com" as UrlOutput;

		const a = getUrlIdsFromOrigin(origin);
		const b = getUrlIdsFromOrigin(origin);

		// Intent: ensure caching is actually happening (not just deterministic recompute).
		expect(b).toBe(a);
	});

	it("returns different ids for different origins", () => {
		const a = getUrlIdsFromOrigin("https://example.com" as UrlOutput);
		const b = getUrlIdsFromOrigin("https://example.org" as UrlOutput);

		expect(b).not.toEqual(a);
	});

	it("produces the expected payload shape and numeric properties", () => {
		const ids = getUrlIdsFromOrigin("https://example.com" as UrlOutput);

		expect(ids).toEqual({
			assetExtBlock: expect.any(Number),
			assetTypeBlock: expect.any(Number),
			cacheHtmlBetter: expect.any(Number),
			compression: expect.any(Number),
			cookieSync: expect.any(Number),
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
