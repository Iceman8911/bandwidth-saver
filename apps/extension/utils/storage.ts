import { BatchQueue, UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";
import { type Browser, browser } from "wxt/browser";
import { type STORAGE_DEFAULTS, StorageAreaSchema } from "@/models/storage";
import { StorageKey } from "@/shared/constants";
import { siteUrlOriginsStorageItem } from "@/shared/storage";

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

const onChanged = browser.storage[storageArea].onChanged;

/**
 * In memory map for storing the site url origins. Strings are small enough to stay in memory without issue.
 *
 * On load, it restores persisted data. Occasionally, it writes back the data to disk
 */
const _siteUrlOriginsMemorySet = new Set<UrlSchema>();

/** A promise is used over a flag to ensure that only one initialization can happen if 2 or more callers call this at once  */
let _siteUrlOriginsInitPromise: Promise<Set<UrlSchema>> | null = null;

/** Workaround since top-level await is not allowed in service workers */
async function getSiteUrlOriginsMemorySet(): Promise<Set<UrlSchema>> {
	if (_siteUrlOriginsInitPromise) return _siteUrlOriginsInitPromise;

	_siteUrlOriginsInitPromise = (async () => {
		for (const origin of await getSiteUrlOriginsFromStorage()) {
			_siteUrlOriginsMemorySet.add(origin);
		}
		return _siteUrlOriginsMemorySet;
	})();

	return _siteUrlOriginsInitPromise;
}

/** For storing urls encountered in the storage onChanged listener, and flushing them to disk at the end of each batch.
 *
 * This may be slightly out of date sometimes, but the short interval should be enough cope :p
 */
const siteUrlOriginsBatchQueue = new BatchQueue<UrlSchema>({
	batchSize: 100,
	intervalMs: 250,
});

siteUrlOriginsBatchQueue.addCallbacks(async (urls) => {
	const set = await getSiteUrlOriginsMemorySet();

	for (const url of urls) {
		set.add(url);
	}

	await siteUrlOriginsStorageItem.setValue([...set]);
});

function extractPossibleUrlFromStorageKey(key: string): UrlSchema | null {
	// Since site scoped entry keys are `${prefix}-${url}`
	const [_, ...possibleUrlParts] = key.split("-");

	const possibleUrl = possibleUrlParts.join("-");

	try {
		return v.parse(UrlSchema, possibleUrl);
	} catch (e) {
		console.warn(
			"Key",
			key,
			"did not have a valid url.\n\nReturning `null` instead...",
		);

		return null;
	}
}

async function getSiteUrlOriginsFromStorage(): Promise<
	ReadonlyArray<UrlSchema>
> {
	const siteUrlOrigins = await siteUrlOriginsStorageItem.getValue();

	if (siteUrlOrigins.length) return siteUrlOrigins;

	const allStorageKeys = await browser.storage[storageArea].getKeys();

	return allStorageKeys.reduce<UrlSchema[]>((origins, key) => {
		const origin = extractPossibleUrlFromStorageKey(key);

		if (origin) origins.push(origin);

		return origins;
	}, []);
}

function recordPossibleSiteOriginsToEnqueue(changes: StorageChanges) {
	for (const storageKey in changes) {
		const url = extractPossibleUrlFromStorageKey(storageKey);

		// Only queue valid, non-extension urls
		if (!url || url.includes("extension://")) continue;

		siteUrlOriginsBatchQueue.enqueue(url);
	}
}

export function startRecordingPossibleSiteOriginsToEnqueue() {
	onChanged.removeListener(recordPossibleSiteOriginsToEnqueue);
	onChanged.addListener(recordPossibleSiteOriginsToEnqueue);
}

/** Returns all the site url origins for all the sites the user has visited* while this extension is active.
 *
 * By vistied, I mean any site that has scoped data changed.
 */
export async function getSiteUrlOrigins(): Promise<ReadonlySet<UrlSchema>> {
	return getSiteUrlOriginsMemorySet();
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
