import { describe, expect, test } from "bun:test";
import { capitalizeString } from "./string";

describe("capitalizeString", () => {
	test("returns empty string for empty input", () => {
		expect(capitalizeString("")).toBe("");
	});

	test("uppercases only the first character and leaves the rest unchanged", () => {
		expect(capitalizeString("hello")).toBe("Hello");
		expect(capitalizeString("hELLO")).toBe("HELLO");
		expect(capitalizeString("1abc")).toBe("1abc");
		expect(capitalizeString(" hello")).toBe(" hello");
	});

	test("does not change already-capitalized strings beyond the first character", () => {
		expect(capitalizeString("Hello")).toBe("Hello");
		expect(capitalizeString("HELLO")).toBe("HELLO");
	});
});
