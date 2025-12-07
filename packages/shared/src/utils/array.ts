export function getRandomElementInArray(
	array: ReadonlyArray<unknown> & { length: 0 },
): undefined;
export function getRandomElementInArray<TArrayElement>(
	array: ReadonlyArray<TArrayElement>,
): TArrayElement;
export function getRandomElementInArray<TArrayElement>(
	array: ReadonlyArray<TArrayElement>,
): TArrayElement | undefined {
	return array[Math.floor(Math.random() * array.length)];
}

export function deduplicateArrayElements<TElement>(
	array: ReadonlyArray<TElement>,
): Array<TElement> {
	return [...new Set(array)];
}
