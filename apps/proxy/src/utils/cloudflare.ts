type GenericCallback = () => unknown;
type TReturnValue<TVal> = TVal extends () => infer R ? Awaited<R> : never;

const CLOUDFLARE_WORKER_FREE_TIER_DURATION = 10; // ms

export async function completeWithinFreeCloudflareWorkerTimeLimit<
	TCallback extends GenericCallback,
>(
	cb: TCallback,
	fallback: TReturnValue<TCallback> | (() => TReturnValue<TCallback>),
): Promise<TReturnValue<TCallback>> {
	return Promise.race([
		Promise.resolve(cb()) as Promise<TReturnValue<TCallback>>,
		new Promise<TReturnValue<TCallback>>((res) =>
			setTimeout(() => {
				if (typeof fallback === "function") {
					res((fallback as () => TReturnValue<TCallback>)());
				} else {
					res(fallback);
				}
			}, CLOUDFLARE_WORKER_FREE_TIER_DURATION * 0.5),
		),
	]);
}
