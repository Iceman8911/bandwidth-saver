import { describe, expect, test } from "bun:test";
import * as v from "valibot";
import type { DataUrlInput, NormalizedUrlInput, UrlInput } from "./shared";
import {
	DataUrlSchema,
	NormalizedUrlSchema,
	NumberBetween1and100Inclusively,
	UrlSchema,
} from "./shared";

describe("NumberBetween1and100Inclusively", () => {
	test("accepts 1..100 inclusive", () => {
		expect(v.parse(NumberBetween1and100Inclusively, 1)).toBe(1);
		expect(v.parse(NumberBetween1and100Inclusively, 50)).toBe(50);
		expect(v.parse(NumberBetween1and100Inclusively, 100)).toBe(100);
	});

	test("clamps values outside the range to the nearest bound", () => {
		expect(v.parse(NumberBetween1and100Inclusively, 0)).toBe(1);
		expect(v.parse(NumberBetween1and100Inclusively, -100)).toBe(1);

		expect(v.parse(NumberBetween1and100Inclusively, 101)).toBe(100);
		expect(v.parse(NumberBetween1and100Inclusively, 999)).toBe(100);
	});
});

describe("UrlSchema", () => {
	test("accepts valid URLs", () => {
		const httpsUrl: UrlInput = "https://example.com";
		const localhostUrl: UrlInput = "http://localhost:8080/a?b=c#d";

		expect(String(v.parse(UrlSchema, httpsUrl))).toBe(httpsUrl);
		expect(String(v.parse(UrlSchema, localhostUrl))).toBe(localhostUrl);
	});

	test("rejects non-URLs", () => {
		expect(v.safeParse(UrlSchema, "not a url").success).toBe(false);
		expect(v.safeParse(UrlSchema, "example.com").success).toBe(false);
	});
});

describe("DataUrlSchema", () => {
	test("accepts base64 data URLs", () => {
		const url: DataUrlInput = "data:text/plain;base64,SGVsbG8sIHdvcmxkIQ==";
		expect(String(v.parse(DataUrlSchema, url))).toBe(url);
	});

	test("rejects non-base64 or non-data URLs", () => {
		expect(v.safeParse(DataUrlSchema, "https://example.com/x").success).toBe(
			false,
		);
		expect(v.safeParse(DataUrlSchema, "data:text/plain,hello").success).toBe(
			false,
		);
	});
});

describe("NormalizedUrlSchema", () => {
	test("accepts a normal URL string", () => {
		const url: NormalizedUrlInput = "https://example.com/a,b";

		expect(String(v.parse(NormalizedUrlSchema, url))).toBe(url);
	});

	test("joins comma-split arrays into a single URL string then validates", () => {
		const input: NormalizedUrlInput = ["https://example.com/a", "b", "c?d=e"];

		const value = v.parse(NormalizedUrlSchema, input);

		expect(String(value)).toBe("https://example.com/a,b,c?d=e");
	});

	test("rejects arrays that do not form a valid URL after joining", () => {
		expect(v.safeParse(NormalizedUrlSchema, ["not", "a", "url"]).success).toBe(
			false,
		);
	});
});
