import { afterEach, describe, expect, test } from "bun:test";
import * as v from "valibot";
import {
	type ImageCompressionPayloadInput,
	ImageCompressionPayloadSchema,
} from "../../models/image-optimization";
import { getCompressedImageUrlWithFallback } from "./get-optimal-url";

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function createHeadResponse({
	ok,
	contentLength,
	contentType,
}: {
	ok: boolean;
	contentLength?: string | null;
	contentType?: string | null;
}): Response {
	const headers = new Headers();

	if (contentLength != null) headers.set("content-length", contentLength);
	if (contentType != null) headers.set("content-type", contentType);

	return new Response(null, { headers, status: ok ? 200 : 500 });
}

describe("getCompressedImageUrlWithFallback", () => {
	test("returns original url when no alternative is viable", async () => {
		const originalUrl = "https://example.com/a.jpg";

		globalThis.fetch = (async (input, init) => {
			if (init?.method !== "HEAD")
				throw new Error("Expected HEAD requests only");

			const url = String(input);

			if (url === originalUrl) {
				return createHeadResponse({
					contentLength: "1000",
					contentType: "image/jpeg",
					ok: true,
				});
			}

			return createHeadResponse({ ok: false });
		}) as typeof fetch;

		const input: ImageCompressionPayloadInput = {
			forceManual_bwsvr8911: false,
			format_bwsvr8911: "auto",
			preserveAnim_bwsvr8911: true,
			quality_bwsvr8911: "80",
			zz_url_bwsvr8911: originalUrl,
		};

		const payload = v.parse(ImageCompressionPayloadSchema, input);

		const res = await getCompressedImageUrlWithFallback(
			payload,
			undefined,
			false,
		);

		expect(res.bytesSaved).toBe(0);
		expect(String(res.url)).toBe(originalUrl);
	});

	test("returns a smaller alternative url when available", async () => {
		const originalUrl = "https://example.com/a.jpg";
		const seenAltUrls = new Set<string>();

		globalThis.fetch = (async (input, init) => {
			if (init?.method !== "HEAD")
				throw new Error("Expected HEAD requests only");

			const url = String(input);

			if (url === originalUrl) {
				return createHeadResponse({
					contentLength: "1000",
					contentType: "image/jpeg",
					ok: true,
				});
			}

			seenAltUrls.add(url);

			return createHeadResponse({
				contentLength: "600",
				contentType: "image/webp",
				ok: true,
			});
		}) as typeof fetch;

		const input: ImageCompressionPayloadInput = {
			forceManual_bwsvr8911: false,
			format_bwsvr8911: "auto",
			preserveAnim_bwsvr8911: true,
			quality_bwsvr8911: "80",
			zz_url_bwsvr8911: originalUrl,
		};

		const payload = v.parse(ImageCompressionPayloadSchema, input);

		const res = await getCompressedImageUrlWithFallback(
			payload,
			undefined,
			false,
		);

		expect(String(res.url)).not.toBe(originalUrl);
		expect(seenAltUrls.has(String(res.url))).toBe(true);
		expect(res.bytesSaved).toBe(400);
	});

	test("never rewrites svg urls", async () => {
		const originalUrl = "https://example.com/a.svg";

		globalThis.fetch = (async (input, init) => {
			if (init?.method !== "HEAD")
				throw new Error("Expected HEAD requests only");

			const url = String(input);

			if (url === originalUrl) {
				return createHeadResponse({
					contentLength: "1000",
					contentType: "image/svg+xml",
					ok: true,
				});
			}

			return createHeadResponse({
				contentLength: "10",
				contentType: "image/webp",
				ok: true,
			});
		}) as typeof fetch;

		const input: ImageCompressionPayloadInput = {
			forceManual_bwsvr8911: false,
			format_bwsvr8911: "auto",
			preserveAnim_bwsvr8911: true,
			quality_bwsvr8911: "80",
			zz_url_bwsvr8911: originalUrl,
		};

		const payload = v.parse(ImageCompressionPayloadSchema, input);

		const res = await getCompressedImageUrlWithFallback(
			payload,
			undefined,
			false,
		);

		expect(res.bytesSaved).toBe(0);
		expect(String(res.url)).toBe(originalUrl);
	});
});
