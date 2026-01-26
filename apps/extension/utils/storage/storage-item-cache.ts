import { lru } from "tiny-lru";
import type { WxtStorageItem } from "wxt/utils/storage";

/**
 * In-memory cache for storage item "value" reads/writes.
 *
 * @remarks
 * This module is intentionally dependency-light to avoid circular imports
 * between `shared/storage.ts` and broader storage utilities.
 */
const storageItemDataCache = lru();

/**
 * Returns a proxy wrapping the storage item so value (not metadata) reads and
 * writes redirect to an in-memory cache.
 *
 * - `getValue()` will return cached value if present; otherwise it reads from
 *   the underlying item and caches the result.
 * - `setValue(value)` will synchronously update the cache and then asynchronously
 *   flush to disk via the underlying storage item.
 */
export function addCacheSupportToStorageItem<
	TStorageItem extends WxtStorageItem<unknown, Record<string, unknown>>,
>(item: TStorageItem): TStorageItem {
	return new Proxy(item, {
		get(target, prop, receiver) {
			const { key } = target;

			switch (prop) {
				case "getValue": {
					return new Proxy(target[prop], {
						async apply(fn, thisArg, args) {
							const cachedValue = storageItemDataCache.get(key);

							if (cachedValue !== undefined) return cachedValue;

							const freshValue = await Reflect.apply(fn, thisArg, args);

							storageItemDataCache.set(key, freshValue);

							return freshValue;
						},
					});
				}

				case "setValue": {
					return new Proxy(target[prop], {
						async apply(fn, thisArg, [valueToSet]) {
							storageItemDataCache.set(key, valueToSet);

							// Asynchronously flush to disk
							void Reflect.apply(fn, thisArg, [valueToSet]);
						},
					});
				}
			}

			return Reflect.get(target, prop, receiver);
		},
	});
}
