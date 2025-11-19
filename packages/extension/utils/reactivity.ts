import { createAsync } from "@solidjs/router";
import type { Accessor } from "solid-js";

const signalCache = new WeakMap<
	WxtStorageItem<unknown, Record<string, unknown>>,
	Accessor<unknown>
>();

export function convertStorageItemToReadonlySignal<
	TStorageItem extends WxtStorageItem<unknown, Record<string, unknown>>,
>(
	storageItem: TStorageItem,
): Accessor<
	TStorageItem extends WxtStorageItem<
		infer TStorageValue,
		Record<string, unknown>
	>
		? TStorageValue | undefined
		: never
> {
	type TStorageValue = TStorageItem extends WxtStorageItem<
		infer TStorageValue,
		Record<string, unknown>
	>
		? TStorageValue
		: never;

	const cachedSignal = signalCache.get(storageItem) as
		| Accessor<TStorageValue | undefined>
		| undefined;

	if (cachedSignal) return cachedSignal as Accessor<TStorageValue>;

	const [get, set] = createSignal<Promise<TStorageValue>>(
		storageItem.getValue() as Promise<TStorageValue>,
	);

	storageItem.watch((newData) => {
		set(Promise.resolve(newData as TStorageValue));
	});

	const resolvedPromise = createAsync(get);

	signalCache.set(storageItem, resolvedPromise);

	//@ts-expect-error TypeScript can't prove the return type matches, but it does at runtime
	return resolvedPromise;
}
