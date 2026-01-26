import {
	type Accessor,
	createEffect,
	createSignal,
	on,
	onCleanup,
} from "solid-js";
import { storage, type WxtStorageItem } from "wxt/utils/storage";

export function convertStorageItemToReactiveSignal<TValue>(
	getStorageItem: Accessor<WxtStorageItem<TValue, Record<string, any>>>,
	defaultValue: TValue,
): Accessor<TValue> {
	const [storageValue, setStorageValue] = createSignal<TValue>(defaultValue);

	createEffect(
		on(getStorageItem, (storageItem) => {
			// Get initial value when storage item changes
			storageItem.getValue().then((val) => {
				setStorageValue(() => val ?? defaultValue);
			});

			// Watch for changes to this specific storage item
			const cleanup = storage.watch(storageItem.key, (val) => {
				//@ts-expect-error Unknown stuff
				setStorageValue(() => val ?? defaultValue);
			});

			onCleanup(cleanup);
		}),
	);

	return storageValue as Accessor<TValue>;
}
