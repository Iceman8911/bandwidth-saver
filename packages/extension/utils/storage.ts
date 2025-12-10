import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";
import { type STORAGE_DEFAULTS, StorageAreaSchema } from "@/models/storage";
import { StorageKey } from "@/shared/constants";
import { getSiteSpecificGeneralSettingsStorageItem } from "@/shared/storage";

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

export async function getSiteUrlOriginsFromStorage(): Promise<
	ReadonlyArray<UrlSchema>
> {
	const storageKeys = await browser.storage[storageArea].getKeys();

	return storageKeys.reduce<UrlSchema[]>((urls, key) => {
		const possibleUrl = extractPossibleUrlFromStorageKey(key);

		if (possibleUrl) {
			urls.push(possibleUrl);
		}

		return urls;
	}, []);
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
export function watchChangesToSiteSpecificSettings(
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

export async function getSiteDomainsToNotApplyDefaultRule(): Promise<
	ReadonlyArray<string>
> {
	const urls = await getSiteUrlOriginsFromStorage();

	const domains: string[] = [];

	for (const url of urls) {
		const { useDefaultRules } =
			await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

		if (!useDefaultRules) domains.push(new URL(url).host);
	}

	return domains;
}
