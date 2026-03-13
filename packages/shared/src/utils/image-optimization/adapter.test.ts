import { describe, expect, test } from "bun:test";
import { ImageCompressorEndpoint, ServerAPIEndpoint } from "../../constants";
import type { ImageCompressionPayloadOutput } from "../../models/image-optimization";
import type { UrlOutput } from "../../models/shared";
import {
	IMAGE_COMPRESSION_URL_CONSTRUCTORS,
	proxyUrlConstructor,
} from "./adapter";

const basePayload = (
	overrides: Partial<ImageCompressionPayloadOutput> = {},
): ImageCompressionPayloadOutput => ({
	format_bwsvr8911: "auto",
	quality_bwsvr8911: 80,
	zz_url_bwsvr8911: "https://example.com/image.jpg?x=1&y=2" as UrlOutput,
	...overrides,
});

describe("proxyUrlConstructor", () => {
	test("builds endpoint/path and includes payload entries (including array JSON)", () => {
		const url = proxyUrlConstructor({
			mainEndpoint: "https://proxy.example" as UrlOutput,
			path: ServerAPIEndpoint.PROCESS_IMAGE,
			payload: basePayload({
				backupEndpoints_bwsvr8911: [
					"https://a.example" as UrlOutput,
					"https://b.example" as UrlOutput,
				],
				forceManual_bwsvr8911: true,
			}),
		});

		expect(url.startsWith("https://proxy.example/image?")).toBe(true);
		expect(url.includes("quality_bwsvr8911=80")).toBe(true);
		expect(
			url.includes("zz_url_bwsvr8911=https://example.com/image.jpg?x=1&y=2"),
		).toBe(true);
		expect(url.includes("forceManual_bwsvr8911=true")).toBe(true);
		expect(
			url.includes(
				`backupEndpoints_bwsvr8911=${JSON.stringify([
					"https://a.example",
					"https://b.example",
				])}`,
			),
		).toBe(true);
	});
});

describe("IMAGE_COMPRESSION_URL_CONSTRUCTORS", () => {
	test("wsrv.nl: returns original url when already redirected", () => {
		const payload = basePayload({
			zz_url_bwsvr8911:
				`${ImageCompressorEndpoint.WSRV_NL}/?url=https%3A%2F%2Fexample.com%2Fimage.jpg&q=80&n=1&output=webp` as UrlOutput,
		});

		const out =
			IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.WSRV_NL](
				payload,
			);

		expect(out).toBe(payload.zz_url_bwsvr8911);
	});

	test("wsrv.nl: uses n=-1 when preserveAnim is true and defaults to output=webp", () => {
		const payload = basePayload({
			format_bwsvr8911: "auto",
			preserveAnim_bwsvr8911: true,
		});

		const out =
			IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.WSRV_NL](
				payload,
			);

		expect(out.startsWith(`${ImageCompressorEndpoint.WSRV_NL}/?url=`)).toBe(
			true,
		);
		expect(out.includes("&q=80")).toBe(true);
		expect(out.includes("&n=-1")).toBe(true);
		expect(out.includes("&output=webp")).toBe(true);
	});

	test("wsrv.nl: passes through DNR capture-group (no encode) and includes default when provided", () => {
		const payload = basePayload({
			default_bwsvr8911: "https://example.com/fallback.jpg" as UrlOutput,
			// Adapter logic supports passing through a DNR capture-group (not a URL) at runtime.
			// @ts-expect-error - this test intentionally passes a non-URL to validate passthrough behavior.
			zz_url_bwsvr8911: "\\1",
		});

		const out =
			IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.WSRV_NL](
				payload,
			);

		expect(out.includes("url=\\1")).toBe(true);
		expect(out.includes(`&default=${payload.default_bwsvr8911}`)).toBe(true);
	});

	test("flyimg.io: returns original url when already redirected", () => {
		const payload = basePayload({
			zz_url_bwsvr8911:
				`${ImageCompressorEndpoint.FLY_IMG_IO}/upload/q_80,o_webp/https%3A%2F%2Fexample.com%2Fimage.jpg` as UrlOutput,
		});

		const out =
			IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.FLY_IMG_IO](
				payload,
			);

		expect(out).toBe(payload.zz_url_bwsvr8911);
	});

	test("icdn.dev: maps jpg -> jpeg and includes quality", () => {
		const payload = basePayload({
			format_bwsvr8911: "jpg",
		});

		const out =
			IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.IMAGE_CDN](
				payload,
			);

		expect(out.startsWith(`${ImageCompressorEndpoint.IMAGE_CDN}/`)).toBe(true);
		expect(out.includes("quality=80")).toBe(true);
		expect(out.includes("format=jpeg")).toBe(true);
	});

	test("wordpress: strips protocol and includes quality", () => {
		const payload = basePayload({
			zz_url_bwsvr8911: "https://cdn.example.com/p/a.png" as UrlOutput,
		});

		const out =
			IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.WORDPRESS](
				payload,
			);

		expect(out).toBe(
			`${ImageCompressorEndpoint.WORDPRESS}/cdn.example.com/p/a.png?quality=80` as UrlOutput,
		);
	});

	test("serveproxy: returns original url when already redirected", () => {
		const payload = basePayload({
			zz_url_bwsvr8911:
				`${ImageCompressorEndpoint.SERVE_PROXY}/?url=https%3A%2F%2Fexample.com%2Fimage.jpg` as UrlOutput,
		});

		const out =
			IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.SERVE_PROXY](
				payload,
			);

		expect(out).toBe(payload.zz_url_bwsvr8911);
	});

	test("cloudinary: returns original url when missing cloud name", () => {
		const payload = basePayload({
			cloudinary_bwsvr8911: undefined,
		});

		const out =
			IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.CLOUDINARY](
				payload,
			);

		expect(out).toBe(payload.zz_url_bwsvr8911);
	});

	test("cloudinary: builds fetch URL when cloud name exists", () => {
		const payload = basePayload({
			cloudinary_bwsvr8911: "demo-cloud",
			format_bwsvr8911: "webp",
			preserveAnim_bwsvr8911: true,
		});

		const out =
			IMAGE_COMPRESSION_URL_CONSTRUCTORS[ImageCompressorEndpoint.CLOUDINARY](
				payload,
			);

		expect(
			out.startsWith(
				`${ImageCompressorEndpoint.CLOUDINARY}/demo-cloud/image/fetch/`,
			),
		).toBe(true);
		expect(out.includes("q_80")).toBe(true);
		expect(out.includes("f_webp")).toBe(true);
		expect(out.includes("fl_animated")).toBe(true);
	});
});
