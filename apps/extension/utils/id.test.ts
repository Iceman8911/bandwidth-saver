import { describe, expect, it } from "vitest";
import { generateDeterministicNumericIdsFromString } from "./id";

describe("generateDeterministicNumericIdsFromString", () => {
	it("returns an array of the requested length", () => {
		const ids = generateDeterministicNumericIdsFromString(
			"https://example.com",
			10,
		);
		expect(ids).toHaveLength(10);
	});

	it("is deterministic for the same origin and count across calls", () => {
		// Note: The implementation uses module-level mutable state, so we assert
		// determinism by comparing within a single "session" of calls using fresh
		// imports implicitly provided by the test environment.
		//
		// This test will catch regressions where the function becomes non-deterministic
		// solely due to origin/count inputs.
		const origin = "https://example.com";
		const count = 7;

		const first = generateDeterministicNumericIdsFromString(origin, count);
		const second = generateDeterministicNumericIdsFromString(origin, count);

		expect(second).toEqual(first);
	});

	it("generates different outputs for different origins (same count)", () => {
		const a = generateDeterministicNumericIdsFromString(
			"https://example.com",
			5,
		);
		const b = generateDeterministicNumericIdsFromString(
			"https://example.org",
			5,
		);

		expect(a).not.toEqual(b);
	});

	it("all IDs are unsigned 32-bit integers and >= 1", () => {
		const ids = generateDeterministicNumericIdsFromString(
			"https://example.com",
			20,
		);

		for (const id of ids) {
			expect(Number.isInteger(id)).toBe(true);
			expect(id).toBeGreaterThanOrEqual(1);
			// Unsigned 32-bit max
			expect(id).toBeLessThanOrEqual(0xffffffff);
		}
	});

	it("produces unique IDs within a single call (typical counts)", () => {
		const ids = generateDeterministicNumericIdsFromString(
			"https://example.com",
			20,
		);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("handles empty origin string", () => {
		const ids = generateDeterministicNumericIdsFromString("", 5);
		expect(ids).toHaveLength(5);

		for (const id of ids) {
			expect(id).toBeGreaterThanOrEqual(1);
		}
	});

	it("returns an empty array when count is 0", () => {
		const ids = generateDeterministicNumericIdsFromString(
			"https://example.com",
			0,
		);
		expect(ids).toEqual([]);
	});

	it("does not throw for unicode input", () => {
		expect(() =>
			generateDeterministicNumericIdsFromString(
				"https://例え.テスト/路径/😺",
				5,
			),
		).not.toThrow();
	});
});
