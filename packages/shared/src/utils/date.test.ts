import { describe, expect, test } from "bun:test";
import { getDayStartInMillisecondsUTC } from "./date";

describe("getDayStartInMillisecondsUTC", () => {
	test("returns UTC midnight for the current day (using fake time)", () => {
		const originalDate = globalThis.Date;

		try {
			const fixed = new originalDate("2024-02-29T23:59:59.999Z");

			class FakeDate extends originalDate {
				constructor() {
					super(fixed.getTime());
				}

				static override now(): number {
					return fixed.getTime();
				}
			}

			//@ts-expect-error Swapping Date in test env
			globalThis.Date = FakeDate;

			expect(getDayStartInMillisecondsUTC()).toBe(
				new originalDate("2024-02-29T00:00:00.000Z").getTime(),
			);
		} finally {
			globalThis.Date = originalDate;
		}
	});

	test("is stable across multiple calls within the same fake day", () => {
		const originalDate = globalThis.Date;

		try {
			const fixed = new originalDate("2025-01-01T12:34:56.789Z");

			class FakeDate extends originalDate {
				constructor() {
					super(fixed.getTime());
				}

				static override now(): number {
					return fixed.getTime();
				}
			}

			//@ts-expect-error Swapping Date in test env
			globalThis.Date = FakeDate;

			const a = getDayStartInMillisecondsUTC();
			const b = getDayStartInMillisecondsUTC();

			expect(a).toBe(b);
		} finally {
			globalThis.Date = originalDate;
		}
	});
});
