import { describe, expect, test } from "bun:test";
import { clone } from "./clone";

describe("clone", () => {
	test("returns a deep-cloned value for plain objects", () => {
		const input = { a: 1, arr: [1, 2, 3], nested: { b: 2 } };
		const output = clone(input);

		expect(output).toEqual(input);
		expect(output).not.toBe(input);
		expect(output.nested).not.toBe(input.nested);
		expect(output.arr).not.toBe(input.arr);
	});

	test("preserves special built-ins supported by structuredClone (Date, Map, Set)", () => {
		const date = new Date("2020-01-02T03:04:05.006Z");
		const map = new Map<string, number>([
			["a", 1],
			["b", 2],
		]);
		const set = new Set<number>([1, 2, 3]);

		const input = { date, map, set };
		const output = clone(input);

		expect(output).toEqual(input);

		expect(output.date).toBeInstanceOf(Date);
		expect(output.date.getTime()).toBe(date.getTime());

		expect(output.map).toBeInstanceOf(Map);
		expect(output.map).not.toBe(map);
		expect([...output.map.entries()]).toEqual([...map.entries()]);

		expect(output.set).toBeInstanceOf(Set);
		expect(output.set).not.toBe(set);
		expect([...output.set.values()]).toEqual([...set.values()]);
	});

	test("does not share references between input and output", () => {
		const input = { nested: { x: 1 } };
		const output = clone(input);

		output.nested.x = 999;

		expect(input.nested.x).toBe(1);
		expect(output.nested.x).toBe(999);
	});
});
