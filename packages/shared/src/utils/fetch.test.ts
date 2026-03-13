import { describe, expect, test } from "bun:test";
import { ProxyCustomHeaders } from "../constants";
import {
	getFetchTimeoutSignal,
	getLikelyImageUrlMimeType,
	getSpoofingFetchHeaders,
} from "./fetch";

describe("getLikelyImageUrlMimeType", () => {
	test("prefers a valid provided content-type over extension sniffing", () => {
		expect(
			getLikelyImageUrlMimeType(
				"https://example.com/file.unknown",
				"image/png",
			),
		).toBe("image/png");
	});

	test("falls back to extension sniffing when content-type is missing/invalid", () => {
		expect(getLikelyImageUrlMimeType("https://x.y/a.png")).toBe("image/png");
		expect(getLikelyImageUrlMimeType("https://x.y/a.jpg")).toBe("image/jpeg");
		expect(getLikelyImageUrlMimeType("https://x.y/a.jpeg")).toBe("image/jpeg");
		expect(getLikelyImageUrlMimeType("https://x.y/a.webp")).toBe("image/webp");
		expect(getLikelyImageUrlMimeType("https://x.y/a.avif")).toBe("image/avif");
		expect(getLikelyImageUrlMimeType("https://x.y/a.gif")).toBe("image/gif");
		expect(getLikelyImageUrlMimeType("https://x.y/a.bmp")).toBe("image/bmp");
		expect(getLikelyImageUrlMimeType("https://x.y/a.tiff")).toBe("image/tiff");
		expect(getLikelyImageUrlMimeType("https://x.y/a.tif")).toBe("image/tiff");
		expect(getLikelyImageUrlMimeType("https://x.y/a.apng")).toBe("image/apng");
		expect(getLikelyImageUrlMimeType("https://x.y/a.svg")).toBe(
			"image/svg+xml",
		);
	});

	test("does not treat query or hash fragments as extensions", () => {
		expect(getLikelyImageUrlMimeType("https://x.y/a?file=.png")).toBeNull();
		expect(getLikelyImageUrlMimeType("https://x.y/a#file=.png")).toBeNull();
	});

	test("returns null when no type can be determined", () => {
		expect(
			getLikelyImageUrlMimeType("https://example.com/no-extension", undefined),
		).toBeNull();

		expect(
			getLikelyImageUrlMimeType("https://example.com/file.bin", "text/plain"),
		).toBeNull();
	});
});

describe("getFetchTimeoutSignal", () => {
	test("returns an AbortSignal and aborts after the timeout", async () => {
		const signal = getFetchTimeoutSignal(1);

		expect(signal).toBeInstanceOf(AbortSignal);

		await new Promise((res) => setTimeout(res, 10));

		expect(signal.aborted).toBe(true);
	});
});

describe("getSpoofingFetchHeaders", () => {
	test("includes baseline headers", () => {
		const headers = getSpoofingFetchHeaders();

		expect(headers["Accept"]).toContain("image/");
		expect(headers["Accept-Encoding"]).toContain("gzip");
		expect(headers["Accept-Language"]).toContain("en");
		expect(headers["Connection"]).toBe("keep-alive");
		expect(headers["User-Agent"]).toContain("Mozilla");
	});

	test("sets Cookie header by default when cookieStr is provided", () => {
		const headers = getSpoofingFetchHeaders({
			cookieStr: "a=b; c=d",
			url: "https://example.com/path",
		});

		expect(headers["Cookie"]).toBe("a=b; c=d");
		expect(headers[ProxyCustomHeaders.DNR_COOKIE_STRING]).toBeUndefined();
	});

	test("sets DNR cookie header when isForBackupProxy is true", () => {
		const headers = getSpoofingFetchHeaders({
			cookieStr: "a=b",
			isForBackupProxy: true,
			url: "https://example.com/path",
		});

		expect(headers["Cookie"]).toBeUndefined();
		expect(headers[ProxyCustomHeaders.DNR_COOKIE_STRING]).toBe("a=b");
	});

	test("adds Referer as the origin when url is provided", () => {
		const headers = getSpoofingFetchHeaders({ url: "https://a.b/c?d=e#f" });

		expect(headers["Referer"]).toBe("https://a.b");
	});
});
