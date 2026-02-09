import { getRandomUUID } from "@bandwidth-saver/shared";
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

	it("all IDs are DNR-safe positive int32 rule ids (integer, finite, 1..2^31-1)", () => {
		const ids = Array.from({ length: 20000 }, (_, i) =>
			generateDeterministicNumericIdsFromString(
				`https://${getRandomUUID()}${i}.com`,
				10,
			),
		).flat();

		for (const id of ids) {
			expect(Number.isFinite(id)).toBe(true);
			expect(Number.isInteger(id)).toBe(true);
			expect(id).toBeGreaterThanOrEqual(1);
			// Signed 32-bit max (Chrome DNR rule ids must fit this range in practice)
			expect(id).toBeLessThanOrEqual(0x7fffffff);
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

	it("has a near-zero collision rate for a realistic DNR-sized corpus (500 origins, 10 ids each)", () => {
		const TOTAL_ORIGINS = 500;
		const IDS_PER_ORIGIN = 10;

		const BASE_DOMAINS = [
			"google.com",
			"youtube.com",
			"facebook.com",
			"wikipedia.org",
			"amazon.com",
			"x.com",
			"reddit.com",
			"netflix.com",
			"microsoft.com",
			"apple.com",
			"cloudflare.com",
			"mozilla.org",
			"openai.com",
			"github.com",
			"stackoverflow.com",
			"bbc.co.uk",
			"nytimes.com",
			"cnn.com",
			"duckduckgo.com",
			"bing.com",
		] as const;

		const seen = new Set<number>();
		let collisions = 0;
		let totalDraws = 0;

		for (let i = 0; i < TOTAL_ORIGINS; i++) {
			const base = BASE_DOMAINS[i % BASE_DOMAINS.length];

			const subdomainVariant = (() => {
				switch (i % 5) {
					case 0:
						return "www";
					case 1:
						return "m";
					case 2:
						return "api";
					case 3:
						return "cdn";
					default:
						return "images";
				}
			})();

			// Keep the corpus fully deterministic and URL-like.
			const origin = `https://${subdomainVariant}.${i.toString(36)}.${base}`;

			const ids = generateDeterministicNumericIdsFromString(
				origin,
				IDS_PER_ORIGIN,
			);
			totalDraws += ids.length;

			for (const id of ids) {
				if (seen.has(id)) collisions++;
				else seen.add(id);
			}
		}

		const collisionRate = collisions / totalDraws;
		const uniqueRate = seen.size / totalDraws;

		expect(collisionRate).toBeLessThanOrEqual(0.001);
		expect(uniqueRate).toBeGreaterThanOrEqual(0.999);
	});
});
