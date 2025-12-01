import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";
import { type STORAGE_DEFAULTS, StorageAreaSchema } from "@/models/storage";
import { StorageKey } from "@/shared/constants";

const {
	SITE_SCOPE_SETTINGS_GLOBAL_PREFIX,
	SITE_SCOPE_SETTINGS_COMPRESSION_PREFIX,
	SITE_SCOPE_SETTINGS_BLOCK_PREFIX,
	SITE_SCOPE_SETTINGS_PROXY_PREFIX,
} = StorageKey;

const storageArea = v.parse(
	StorageAreaSchema,
	SITE_SCOPE_SETTINGS_GLOBAL_PREFIX.split(":")[0],
);

function extractPossibleUrlFromStorageKey(key: string): UrlSchema | null {
	const [_, keyIdentifierWithoutStorageAreaDesignation] =
		SITE_SCOPE_SETTINGS_GLOBAL_PREFIX.split(":");

	if (!keyIdentifierWithoutStorageAreaDesignation) return null;

	const [__, possibleUrl] = key.split(
		keyIdentifierWithoutStorageAreaDesignation,
	);

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

type SiteSpecificStorageChange = (
	| {
			type: "global";
			change: StorageChange<
				(typeof STORAGE_DEFAULTS)[typeof SITE_SCOPE_SETTINGS_GLOBAL_PREFIX]
			>;
	  }
	| {
			type: "compression";
			change: StorageChange<
				(typeof STORAGE_DEFAULTS)[typeof SITE_SCOPE_SETTINGS_COMPRESSION_PREFIX]
			>;
	  }
	| {
			type: "block";
			change: StorageChange<
				(typeof STORAGE_DEFAULTS)[typeof SITE_SCOPE_SETTINGS_BLOCK_PREFIX]
			>;
	  }
	| {
			type: "proxy";
			change: StorageChange<
				(typeof STORAGE_DEFAULTS)[typeof SITE_SCOPE_SETTINGS_PROXY_PREFIX]
			>;
	  }
) & {
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

			if (key.startsWith(SITE_SCOPE_SETTINGS_BLOCK_PREFIX)) {
				siteSpecificChanges.push({
					change,
					type: "block",
					url,
				});
			} else if (key.startsWith(SITE_SCOPE_SETTINGS_COMPRESSION_PREFIX)) {
				siteSpecificChanges.push({
					change,
					type: "compression",
					url,
				});
			} else if (key.startsWith(SITE_SCOPE_SETTINGS_GLOBAL_PREFIX)) {
				siteSpecificChanges.push({
					change,
					type: "global",
					url,
				});
			} else if (key.startsWith(SITE_SCOPE_SETTINGS_PROXY_PREFIX)) {
				siteSpecificChanges.push({
					change,
					type: "proxy",
					url,
				});
			}
		}

		callback(siteSpecificChanges);
	};

	onChanged.addListener(listener);

	return () => onChanged.removeListener(listener);
}
