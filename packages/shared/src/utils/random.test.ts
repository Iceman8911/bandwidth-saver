import { describe, expect, test } from "bun:test";
import { getRandomUUID } from "./random";

describe("getRandomUUID", () => {
	test("returns a UUID string", () => {
		const id = getRandomUUID();

		expect(typeof id).toBe("string");
		expect(id.length).toBeGreaterThan(0);

		// Basic UUID v4 format check: 8-4-4-4-12 hex chars.
		expect(id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
	});

	test("generates different values across calls", () => {
		const a = getRandomUUID();
		const b = getRandomUUID();

		expect(a).not.toBe(b);
	});
});
