import { type Accessor, createSignal } from "solid-js";
import type { Unwatch } from "wxt/utils/storage";

type AnyRecord = Record<string, any>;

const signalAndCleanupCache = new WeakMap<
	WxtStorageItem<any, AnyRecord>,
	readonly [Accessor<any>, Unwatch]
>();

export function convertStorageItemToReadonlySignal<
	TStorageItem extends WxtStorageItem<any, AnyRecord>,
>(
	storageItem: TStorageItem,
	defaultValue?: undefined,
): readonly [
	Accessor<
		TStorageItem extends WxtStorageItem<infer TStorageValue, AnyRecord>
			? TStorageValue | undefined
			: never
	>,
	Unwatch,
];
export function convertStorageItemToReadonlySignal<
	TStorageItem extends WxtStorageItem<any, AnyRecord>,
>(
	storageItem: TStorageItem,
	defaultValue: TStorageItem extends WxtStorageItem<
		infer TStorageValue,
		AnyRecord
	>
		? TStorageValue
		: never,
): readonly [
	Accessor<
		TStorageItem extends WxtStorageItem<infer TStorageValue, AnyRecord>
			? TStorageValue
			: never
	>,
	Unwatch,
];
export function convertStorageItemToReadonlySignal<
	TStorageItem extends WxtStorageItem<any, AnyRecord>,
>(
	storageItem: TStorageItem,
	defaultValue?: TStorageItem extends WxtStorageItem<
		infer TStorageValue,
		AnyRecord
	>
		? TStorageValue
		: never,
): readonly [
	Accessor<
		TStorageItem extends WxtStorageItem<infer TStorageValue, AnyRecord>
			? TStorageValue | undefined
			: never
	>,
	Unwatch,
] {
	const possibleCachedSignalAndCleanup = signalAndCleanupCache.get(storageItem);

	if (possibleCachedSignalAndCleanup) {
		return possibleCachedSignalAndCleanup;
	}

	const [storageValue, setStorageValue] = createSignal(defaultValue);

	storageItem.getValue().then((val) => setStorageValue(() => val));

	const cleanup = storageItem.watch((val) => {
		setStorageValue(() => val);
	});

	const signalAndCleanup = [storageValue, cleanup] as const;

	signalAndCleanupCache.set(storageItem, signalAndCleanup);

	//@ts-expect-error THis is alright, me thinks
	return signalAndCleanup;
}
