import { describe, expect, test } from "bun:test";
import { wrapErrorMessage } from "./error";

describe("createError", () => {
	test("creates an Error with a stringified message for primitives", () => {
		expect(wrapErrorMessage("hello")).toBeInstanceOf(Error);
		expect(wrapErrorMessage("hello").message).toBe("hello");

		expect(wrapErrorMessage(123).message).toBe("123");
		expect(wrapErrorMessage(true).message).toBe("true");
		expect(wrapErrorMessage(null).message).toBe("null");
		expect(wrapErrorMessage(undefined).message).toBe("undefined");
	});

	test("uses the original Error message when given an Error instance", () => {
		const original = new Error("boom");

		const created = wrapErrorMessage(original);

		expect(created).toBeInstanceOf(Error);
		expect(created.message).toBe("boom");
		expect(created).not.toBe(original);
	});

	test("creates the provided error constructor type", () => {
		class CustomError extends Error {
			constructor(message: string) {
				super(message);
				this.name = "CustomError";
			}
		}

		const err = wrapErrorMessage("nope", CustomError);

		expect(err).toBeInstanceOf(CustomError);
		expect(err.message).toBe("nope");
		expect(err.name).toBe("CustomError");
	});

	test("defaults to Error constructor when no constructor is provided", () => {
		const err = wrapErrorMessage("x");

		expect(err).toBeInstanceOf(Error);
		expect(err.constructor).toBe(Error);
	});
});
