import { Result } from "@badrap/result";

type ErrorLikeConstructor<TError extends Error = Error> = new (
	message: string,
) => TError;

export function wrapErrorMessage<TError extends Error>(
	val: unknown,
	errorConstructor?: ErrorLikeConstructor<TError>,
): TError {
	const message = val instanceof Error ? val.message : String(val);

	if (errorConstructor) {
		return new errorConstructor(message);
	}

	return new Error(message) as TError;
}

/** For use when integrating with third party / non Result-type code */
export async function wrapErrorProneCode<TReturnVal>(
	cb: () => TReturnVal | Promise<TReturnVal>,
): Promise<Result<TReturnVal>> {
	try {
		const cbResult = await cb();

		return Result.ok(cbResult);
	} catch (e) {
		return Result.err(wrapErrorMessage(e));
	}
}
