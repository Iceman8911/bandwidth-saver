import { type Accessor, createSignal, onCleanup } from "solid-js";

type AnyRecord = Record<string, any>;

export function convertStorageItemToReadonlySignal<
	TStorageItem extends WxtStorageItem<any, AnyRecord>,
>(
	storageItem: TStorageItem,
	defaultValue?: undefined,
): Accessor<
	TStorageItem extends WxtStorageItem<infer TStorageValue, AnyRecord>
		? TStorageValue | undefined
		: never
>;
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
): Accessor<
	TStorageItem extends WxtStorageItem<infer TStorageValue, AnyRecord>
		? TStorageValue
		: never
>;
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
): Accessor<
	TStorageItem extends WxtStorageItem<infer TStorageValue, AnyRecord>
		? TStorageValue | undefined
		: never
> {
	const [storageValue, setStorageValue] = createSignal(defaultValue);

	const cleanup = storage.watch(storageItem.key, (val) => {
		//@ts-expect-error TS can't figure it out
		setStorageValue(() => val);
	});

	onCleanup(cleanup);

	storageItem.getValue().then((val) => {
		setStorageValue(() => val);
	});

	//@ts-expect-error TS can't figure it out
	return storageValue;
}
