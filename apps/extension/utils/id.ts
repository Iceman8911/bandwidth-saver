import { TEXT_ENCODER } from "@bandwidth-saver/shared";

// xxHash32 pure JS implementation
const PRIME32_1 = 2654435761 >>> 0;
const PRIME32_2 = 2246822519 >>> 0;
const PRIME32_3 = 3266489917 >>> 0;
const PRIME32_4 = 668265263 >>> 0;
const PRIME32_5 = 374761393 >>> 0;

function rotl32(x: number, r: number) {
	return ((x << r) | (x >>> (32 - r))) >>> 0;
}

function xxHash32(input: string, seed = 0): number {
	const data = TEXT_ENCODER.encode(input);
	const length = data.length;
	let h32: number;

	if (length >= 16) {
		const acc = [
			seed + PRIME32_1 + PRIME32_2,
			seed + PRIME32_2,
			seed,
			seed - PRIME32_1,
		];

		let i = 0;
		while (i + 16 <= length) {
			for (let lane = 0; lane < 4; lane++) {
				const v =
					data[i]! |
					(data[i + 1]! << 8) |
					(data[i + 2]! << 16) |
					(data[i + 3]! << 24);
				acc[lane] =
					(rotl32(acc[lane]! + ((v * PRIME32_2) >>> 0), 13) * PRIME32_1) >>> 0;
				i += 4;
			}
		}

		h32 =
			rotl32(acc[0]!, 1) +
			rotl32(acc[1]!, 7) +
			rotl32(acc[2]!, 12) +
			rotl32(acc[3]!, 18);
	} else {
		h32 = seed + PRIME32_5;
	}

	h32 = (h32 + length) >>> 0;

	let i = Math.floor(length / 16) * 16;
	while (i + 4 <= length) {
		const v =
			data[i]! |
			(data[i + 1]! << 8) |
			(data[i + 2]! << 16) |
			(data[i + 3]! << 24);
		h32 = (rotl32(h32 + ((v * PRIME32_3) >>> 0), 17) * PRIME32_4) >>> 0;
		i += 4;
	}

	while (i < length) {
		h32 = (rotl32(h32 + ((data[i]! * PRIME32_5) >>> 0), 11) * PRIME32_1) >>> 0;
		i++;
	}

	h32 ^= h32 >>> 15;
	h32 = (h32 * PRIME32_2) >>> 0;
	h32 ^= h32 >>> 13;
	h32 = (h32 * PRIME32_3) >>> 0;
	h32 ^= h32 >>> 16;

	return h32 >>> 0; // 32-bit unsigned int
}

/**
 * Generate a deterministic, DNR-safe rule id from a string.
 *
 * @remarks
 * Chrome's `declarativeNetRequest` rule ids are effectively constrained to a
 * positive signed 32-bit integer range in practice, and `0` is not a valid id.
 *
 * Rather than mapping invalid output to a constant (which introduces a tiny bias),
 * we deterministically retry hashing with a suffix until we get a non-zero id.
 */
function dnrRuleIdFromString(input: string): number {
	// This should never need more than 0 attempts; retries are just a deterministic safety net.
	const MAX_RETRIES = 8;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		const attemptedInput = attempt === 0 ? input : `${input}:retry=${attempt}`;

		const u32 = xxHash32(attemptedInput);

		// Keep only the low 31 bits => range 0..2147483647
		const i31 = (u32 >>> 0) & 0x7fffffff;

		// Avoid 0 (invalid rule id)
		if (i31 !== 0) return i31;
	}

	// Practically unreachable, but we must return a valid id.
	return 1;
}

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

		// Ensure ids are valid for `declarativeNetRequest` rule ids:
		// - integer
		// - positive
		// - within signed 32-bit range (1..2^31-1)
		ids.push(dnrRuleIdFromString(input));
	}

	//@ts-expect-error We cast to any then to the Tuple to satisfy the compiler
	return ids;
}
