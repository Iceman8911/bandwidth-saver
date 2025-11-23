/**
 * Capitalize the first character of a string.
 * Leaves the rest of the string unchanged.
 */
export function capitalizeString<TInput extends string>(
	input: TInput,
): Capitalize<TInput> {
	//@ts-expect-error TS can't tell this is right
	if (input.length === 0) return input;

	//@ts-expect-error TS can't tell this is right
	return input.charAt(0).toUpperCase() + input.slice(1);
}
