import { describe, expect, test } from "bun:test";
import * as v from "valibot";
import {
	type ImageCompressionPayloadInput,
	ImageCompressionPayloadSchema,
	ImageFormatSchema,
} from "./image-optimization";

describe("ImageFormatSchema", () => {
	test("accepts known formats", () => {
		for (const value of ["auto", "webp", "avif", "jpg"] as const) {
			const parsed = v.safeParse(ImageFormatSchema, value);
			expect(parsed.success).toBe(true);
			if (parsed.success) expect(parsed.output).toBe(value);
		}
	});

	test("rejects unknown formats", () => {
		const parsed = v.safeParse(ImageFormatSchema, "png");
		expect(parsed.success).toBe(false);
	});
});

describe("ImageCompressionPayloadSchema", () => {
	const base: ImageCompressionPayloadInput = {
		quality_bwsvr8911: "80",
		zz_url_bwsvr8911: "https://example.com/image.jpg",
	};

	test("parses a minimal valid payload", () => {
		const parsed = v.safeParse(ImageCompressionPayloadSchema, base);

		expect(parsed.success).toBe(true);
		if (!parsed.success) return;

		expect(parsed.output.quality_bwsvr8911).toBe(80);
		expect(String(parsed.output.zz_url_bwsvr8911)).toBe(
			String(base.zz_url_bwsvr8911),
		);
	});

	test("coerces boolean-like values from strings for optional boolean fields", () => {
		const parsed = v.safeParse(ImageCompressionPayloadSchema, {
			...base,
			forceManual_bwsvr8911: "true",
			preserveAnim_bwsvr8911: "false",
		});

		expect(parsed.success).toBe(true);
		if (!parsed.success) return;

		expect(parsed.output.forceManual_bwsvr8911).toBe(true);
		expect(parsed.output.preserveAnim_bwsvr8911).toBe(false);
	});

	test("allows format with default and accepts explicit formats", () => {
		const parsedDefault = v.safeParse(ImageCompressionPayloadSchema, base);
		expect(parsedDefault.success).toBe(true);
		if (parsedDefault.success) {
			expect(parsedDefault.output.format_bwsvr8911).toBe("auto");
		}

		const parsedExplicit = v.safeParse(ImageCompressionPayloadSchema, {
			...base,
			format_bwsvr8911: "webp",
		});
		expect(parsedExplicit.success).toBe(true);
		if (parsedExplicit.success) {
			expect(parsedExplicit.output.format_bwsvr8911).toBe("webp");
		}
	});

	test("accepts backupEndpoints as JSON string and as array of urls", () => {
		const asString = v.safeParse(ImageCompressionPayloadSchema, {
			...base,
			backupEndpoints_bwsvr8911: JSON.stringify([
				"https://a.example.com",
				"https://b.example.com",
			]),
		});
		expect(asString.success).toBe(true);

		const asArray = v.safeParse(ImageCompressionPayloadSchema, {
			...base,
			backupEndpoints_bwsvr8911: [
				"https://a.example.com",
				"https://b.example.com",
			],
		});
		expect(asArray.success).toBe(true);
	});

	test("clamps quality outside 1..100 (after coercion) to the nearest bound", () => {
		const tooLow = v.safeParse(ImageCompressionPayloadSchema, {
			...base,
			quality_bwsvr8911: "0",
		});
		expect(tooLow.success).toBe(true);
		if (tooLow.success) expect(tooLow.output.quality_bwsvr8911).toBe(1);

		const tooHigh = v.safeParse(ImageCompressionPayloadSchema, {
			...base,
			quality_bwsvr8911: "101",
		});
		expect(tooHigh.success).toBe(true);
		if (tooHigh.success) expect(tooHigh.output.quality_bwsvr8911).toBe(100);
	});

	test("normalizes zz_url_bwsvr8911 when provided as string array (comma-join)", () => {
		const parsed = v.safeParse(ImageCompressionPayloadSchema, {
			...base,
			zz_url_bwsvr8911: ["https://example.com/a", "b.jpg"],
		});

		expect(parsed.success).toBe(true);
		if (!parsed.success) return;

		expect(String(parsed.output.zz_url_bwsvr8911)).toBe(
			"https://example.com/a,b.jpg",
		);
	});

	test("keeps extra keys (loose object) to preserve redirected url context", () => {
		const parsed = v.safeParse(ImageCompressionPayloadSchema, {
			...base,
			extra_bwsvr8911: "keep-me",
			extraNested_bwsvr8911: { ok: true },
		});

		expect(parsed.success).toBe(true);
		if (!parsed.success) return;

		expect(parsed.output["extra_bwsvr8911"]).toBe("keep-me");
		expect(parsed.output["extraNested_bwsvr8911"]).toEqual({
			ok: true,
		});
	});
});
