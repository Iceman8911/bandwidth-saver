import { describe, expect, test } from "bun:test";
import { deduplicateArrayElements, getRandomElementInArray } from "./array";

describe("getRandomElementInArray", () => {
	test("returns undefined for empty array", () => {
		const value = getRandomElementInArray([] as const);
		expect(value).toBeUndefined();
	});

	test("returns the only element for single-element array", () => {
		const value = getRandomElementInArray(["only"] as const);
		expect(value).toBe("only");
	});

	test("returns one of the elements for multi-element arrays (deterministic via Math.random stub)", () => {
		const originalRandom = Math.random;

		try {
			Math.random = () => 0;
			expect(getRandomElementInArray(["a", "b", "c"])).toBe("a");

			Math.random = () => 0.999999;
			expect(getRandomElementInArray(["a", "b", "c"])).toBe("c");
		} finally {
			Math.random = originalRandom;
		}
	});
});

describe("deduplicateArrayElements", () => {
	test("removes duplicates while preserving first-seen order", () => {
		expect(deduplicateArrayElements([1, 2, 1, 3, 2, 4])).toEqual([1, 2, 3, 4]);
		expect(deduplicateArrayElements(["a", "b", "a", "a", "c"])).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	test("does not mutate the input array", () => {
		const input = Object.freeze([1, 2, 2, 3]);
		const output = deduplicateArrayElements(input);

		expect(output).toEqual([1, 2, 3]);
		expect(output).not.toBe(input);
	});
});
