/**
 * Helper to generate a tuple of length N
 */
type Tuple<T, N extends number, R extends T[] = []> = R["length"] extends N
	? R
	: Tuple<T, N, [T, ...R]>;

/**
 * Generates a deterministic array of unique numeric IDs from a given string.
 */
export function generateDeterministicNumericIdsFromString<
	TCount extends number,
>(origin: string, count: TCount = 5 as TCount): Tuple<number, TCount> {
	const ids: number[] = [];

	for (let i = 0; i < count; i++) {
		// Append the index to the origin to get different IDs for the same string
		const input = `${origin}:${i}`;

		/** FNV offset basis */
		let hash = 2166136261;

		for (let j = 0; j < input.length; j++) {
			hash ^= input.charCodeAt(j);
			hash = Math.imul(hash, 16777619);
		}

		// Mask with 0x7FFFFFFF to ensure it's positive and fits in 31 bits
		// This keeps the value between 0 and 2,147,483,647
		const finalId = hash & 0x7fffffff || i + 1;
		ids.push(finalId);
	}

	//@ts-expect-error We cast to any then to the Tuple to satisfy the compiler
	return ids;
}
