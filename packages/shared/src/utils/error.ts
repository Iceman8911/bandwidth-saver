type ErrorLikeConstructor<TError extends Error = Error> = new (
	...args: any
) => TError;

export function wrapErrorMessage<TError extends Error>(
	val: unknown,
	errorConstructor?: ErrorLikeConstructor<TError>,
): TError {
	const message = val instanceof Error ? val.message : String(val);

	return new (errorConstructor ?? Error)(message) as TError;
}
