export function fetchWithTimeout(
	timeoutInMs = 3000,
	...args: Parameters<typeof fetch>
): ReturnType<typeof fetch> {
	return fetch(args[0], {
		signal: AbortSignal.timeout(timeoutInMs),
		...args[1],
	});
}
