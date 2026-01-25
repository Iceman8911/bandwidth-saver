import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";
import { type STORAGE_DEFAULTS, StorageAreaSchema } from "@/models/storage";
import { StorageKey } from "@/shared/constants";

function removeStorageAreaIdentifier<TKey extends string>(
	key: `${StorageAreaSchema}:${TKey}`,
): TKey {
	//@ts-expect-error As long as the types are strict, this can't fail
	return key.split(":")[1];
}

const { SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX: SITE_SPECIFIC_SETTINGS_PREFIX } =
	StorageKey;

const EXTRACTED_SITE_SPECIFIC_SETTINGS_PREFIX = removeStorageAreaIdentifier(
	SITE_SPECIFIC_SETTINGS_PREFIX,
);
const storageArea = v.parse(
	StorageAreaSchema,
	SITE_SPECIFIC_SETTINGS_PREFIX.split(":")[0],
);

function extractPossibleUrlFromStorageKey(key: string): UrlSchema | null {
	const possibleUrl = key.split(EXTRACTED_SITE_SPECIFIC_SETTINGS_PREFIX)[1];

	return possibleUrl ? v.parse(UrlSchema, possibleUrl) : null;
}

export async function* getSiteUrlOriginsFromStorage(): AsyncGenerator<UrlSchema> {
	const storageKeys = await browser.storage[storageArea].getKeys();

	for (const key of storageKeys) {
		const possibleUrl = extractPossibleUrlFromStorageKey(key);

		if (possibleUrl) yield possibleUrl;
	}
}

type StorageChange<TStorageValue> =
	| {
			oldValue?: undefined;
			/** item was added */
			newValue: TStorageValue;
	  }
	| {
			/** item was deleted */
			oldValue: TStorageValue;
			newValue?: undefined;
	  }
	| {
			oldValue: TStorageValue;
			newValue: TStorageValue;
	  };

type SiteSpecificStorageChange = {
	change: StorageChange<
		(typeof STORAGE_DEFAULTS)[typeof SITE_SPECIFIC_SETTINGS_PREFIX]
	>;
	url: UrlSchema;
};

type StorageChanges = Record<string, Browser.storage.StorageChange>;

/**
 *
 * @param callback
 *
 * @returns a callback to remove the listener
 */
export function watchChangesToSiteSpecificGeneralSettings(
	callback: (changes: SiteSpecificStorageChange[]) => void,
) {
	const onChanged = browser.storage[storageArea].onChanged;

	const listener = (changes: StorageChanges) => {
		const siteSpecificChanges: SiteSpecificStorageChange[] = [];

		for (const key in changes) {
			const url = extractPossibleUrlFromStorageKey(key);

			const change = changes[key];

			if (!url || !change) continue;

			if (key.startsWith(EXTRACTED_SITE_SPECIFIC_SETTINGS_PREFIX)) {
				siteSpecificChanges.push({
					change,
					url,
				});
			}
		}

		callback(siteSpecificChanges);
	};

	onChanged.addListener(listener);

	return () => onChanged.removeListener(listener);
}
