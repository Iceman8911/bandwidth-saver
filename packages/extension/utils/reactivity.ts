import { type AccessorWithLatest, createAsync } from "@solidjs/router";
import { createEffect, createSignal } from "solid-js";

const signalCache = new WeakMap<
	WxtStorageItem<unknown, Record<string, unknown>>,
	AccessorWithLatest<unknown>
>();

export function convertStorageItemToReadonlySignal<
	TStorageItem extends WxtStorageItem<unknown, Record<string, unknown>>,
>(
	storageItem: TStorageItem,
): AccessorWithLatest<
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
		| AccessorWithLatest<TStorageValue | undefined>
		| undefined;

	if (cachedSignal) return cachedSignal as AccessorWithLatest<TStorageValue>;

	// signal that holds the current resolved value (synchronous for watch updates)
	const [getValue, setValue] = createSignal<TStorageValue | undefined>(
		undefined,
	);

	// monotonic counters to tag fetches and track the latest id
	let fetchCounter = 0;
	const [getLatestId, setLatestId] = createSignal(0);

	// createAsync expects a function returning a Promise.
	// We return a promise that resolves to an object { id, value } so we can
	// check the id on resolution and only apply the value if it's newest.
	const asyncAccessor = createAsync(async () => {
		const id = ++fetchCounter;
		// mark this fetch as the latest
		setLatestId(id);

		return storageItem
			.getValue()
			.then((v) => ({ id, value: v as TStorageValue }))
			.catch(() => ({ id, value: undefined as TStorageValue | undefined }));
	});

	// apply async results only when their id matches the current latest id
	createEffect(() => {
		const res = asyncAccessor();
		if (!res) return;

		const { id, value } = res;

		if (id === getLatestId()) {
			setValue(() => value);
		}
	});

	// watch updates are applied synchronously and bump the latest id
	storageItem.watch((newData) => {
		const id = ++fetchCounter;
		setLatestId(id);
		setValue(() => newData as TStorageValue);
	});

	// Cache and return the accessor for consumers.
	// The runtime accessor shape is a simple function returning the resolved value.
	signalCache.set(
		storageItem,
		getValue as unknown as AccessorWithLatest<TStorageValue | undefined>,
	);

	return getValue as unknown as AccessorWithLatest<TStorageValue>;
}
