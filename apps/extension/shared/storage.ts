import type { UrlSchema } from "@bandwidth-saver/shared";
import { clone } from "@bandwidth-saver/shared";
import { lru } from "tiny-lru";
import { storage, type WxtStorageItem } from "wxt/utils/storage";
import { STORAGE_DEFAULTS } from "@/models/storage";
import { getUrlSchemaOrigin } from "@/utils/url";
import { StorageKey } from "./constants";

const {
	SCHEMA_VERSION,
	DEFAULT_SETTINGS_COMPRESSION,
	DEFAULT_SETTINGS_PROXY,
	SITE_SPECIFIC_STATISTICS_PREFIX,
	DEFAULT_SETTINGS_GENERAL,
	SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX,
	STATISTICS,
	SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX,
	SITE_SPECIFIC_SETTINGS_PROXY_PREFIX,
	SITE_URL_ORIGINS,
} = StorageKey;

export const schemaVersionStorageItem = storage.defineItem(SCHEMA_VERSION, {
	fallback: clone(STORAGE_DEFAULTS[SCHEMA_VERSION]),
	init: () => clone(STORAGE_DEFAULTS[SCHEMA_VERSION]),
});

export const siteUrlOriginsStorageItem = storage.defineItem(SITE_URL_ORIGINS, {
	fallback: clone(STORAGE_DEFAULTS[SITE_URL_ORIGINS]),
	init: () => clone(STORAGE_DEFAULTS[SITE_URL_ORIGINS]),
});

export const defaultGeneralSettingsStorageItem = storage.defineItem(
	DEFAULT_SETTINGS_GENERAL,
	{
		fallback: clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_GENERAL]),
		init: () => clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_GENERAL]),
	},
);

export const defaultCompressionSettingsStorageItem = storage.defineItem(
	DEFAULT_SETTINGS_COMPRESSION,
	{
		fallback: clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_COMPRESSION]),
		init: () => clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_COMPRESSION]),
	},
);

export const defaultProxySettingsStorageItem = storage.defineItem(
	DEFAULT_SETTINGS_PROXY,
	{
		fallback: clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_PROXY]),
		init: () => clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_PROXY]),
	},
);

export const statisticsStorageItem = storage.defineItem(STATISTICS, {
	fallback: clone(STORAGE_DEFAULTS[STATISTICS]),
	init: () => clone(STORAGE_DEFAULTS[STATISTICS]),
});

const CACHE_SIZE = 100;

const siteSpecificStatisticsStorageItemCache =
	lru<
		WxtStorageItem<
			(typeof STORAGE_DEFAULTS)[typeof SITE_SPECIFIC_STATISTICS_PREFIX],
			Record<string, unknown>
		>
	>(CACHE_SIZE);

const siteSpecificGeneralSettingsStorageItemCache =
	lru<
		WxtStorageItem<
			(typeof STORAGE_DEFAULTS)[typeof DEFAULT_SETTINGS_GENERAL],
			Record<string, unknown>
		>
	>(CACHE_SIZE);

const siteSpecificCompressionSettingsStorageItemCache =
	lru<
		WxtStorageItem<
			(typeof STORAGE_DEFAULTS)[typeof DEFAULT_SETTINGS_COMPRESSION],
			Record<string, unknown>
		>
	>(CACHE_SIZE);

const siteSpecificProxySettingsStorageItemCache =
	lru<
		WxtStorageItem<
			(typeof STORAGE_DEFAULTS)[typeof DEFAULT_SETTINGS_PROXY],
			Record<string, unknown>
		>
	>(CACHE_SIZE);

export const getSiteSpecificStatisticsStorageItem = (url: UrlSchema) => {
	const key =
		`${SITE_SPECIFIC_STATISTICS_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const possibleCachedStorageItem =
		siteSpecificStatisticsStorageItemCache.get(key);

	if (possibleCachedStorageItem) return possibleCachedStorageItem;

	const storageItem = storage.defineItem(key, {
		fallback: clone(STORAGE_DEFAULTS[SITE_SPECIFIC_STATISTICS_PREFIX]),
		init: () => clone(STORAGE_DEFAULTS[SITE_SPECIFIC_STATISTICS_PREFIX]),
	});

	siteSpecificStatisticsStorageItemCache.set(key, storageItem);

	return storageItem;
};

export const getSiteSpecificGeneralSettingsStorageItem = (url: UrlSchema) => {
	const key =
		`${SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const possibleCachedStorageItem =
		siteSpecificGeneralSettingsStorageItemCache.get(key);

	if (possibleCachedStorageItem) return possibleCachedStorageItem;

	const storageItem = storage.defineItem(key, {
		fallback: clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_GENERAL]),
		init: defaultGeneralSettingsStorageItem.getValue,
	});

	siteSpecificGeneralSettingsStorageItemCache.set(key, storageItem);

	return storageItem;
};

export const getSiteSpecificCompressionSettingsStorageItem = (
	url: UrlSchema,
) => {
	const key =
		`${SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const possibleCachedStorageItem =
		siteSpecificCompressionSettingsStorageItemCache.get(key);

	if (possibleCachedStorageItem) return possibleCachedStorageItem;

	const storageItem = storage.defineItem(key, {
		fallback: clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_COMPRESSION]),
		init: defaultCompressionSettingsStorageItem.getValue,
	});

	siteSpecificCompressionSettingsStorageItemCache.set(key, storageItem);

	return storageItem;
};

export const getSiteSpecificProxySettingsStorageItem = (url: UrlSchema) => {
	const key =
		`${SITE_SPECIFIC_SETTINGS_PROXY_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const possibleCachedStorageItem =
		siteSpecificProxySettingsStorageItemCache.get(key);

	if (possibleCachedStorageItem) return possibleCachedStorageItem;

	const storageItem = storage.defineItem(key, {
		fallback: clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_PROXY]),
		init: defaultProxySettingsStorageItem.getValue,
	});

	siteSpecificProxySettingsStorageItemCache.set(key, storageItem);

	return storageItem;
};
