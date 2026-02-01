import type { UrlSchema } from "@bandwidth-saver/shared";
import { clone } from "@bandwidth-saver/shared";
import { lru } from "tiny-lru";
import { storage, type WxtStorageItem } from "wxt/utils/storage";
import {
	type CompressionSettingsSchema,
	DEFAULT_COMPRESSION_SETTINGS,
	DEFAULT_GENERAL_SETTINGS,
	DEFAULT_PROXY_SETTINGS,
	DEFAULT_SCHEMA_VERSION,
	DEFAULT_SITE_SPECIFIC_STATISTICS,
	DEFAULT_SITE_URL_ORIGINS,
	DEFAULT_STATISTICS,
	type DetailedStatisticsSchema,
	type GeneralSettingsSchema,
	type ProxySettingsSchema,
	type SiteUrlOriginsSchema,
	type StatisticsSchema,
} from "@/models/storage";
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
	fallback: clone(DEFAULT_SCHEMA_VERSION),
	init: () => clone(DEFAULT_SCHEMA_VERSION),
});

export const siteUrlOriginsStorageItem =
	storage.defineItem<SiteUrlOriginsSchema>(SITE_URL_ORIGINS, {
		fallback: clone(DEFAULT_SITE_URL_ORIGINS),
		init: () => clone(DEFAULT_SITE_URL_ORIGINS),
	});

export const defaultGeneralSettingsStorageItem =
	storage.defineItem<GeneralSettingsSchema>(DEFAULT_SETTINGS_GENERAL, {
		fallback: clone(DEFAULT_GENERAL_SETTINGS),
		init: () => clone(DEFAULT_GENERAL_SETTINGS),
	});

export const defaultCompressionSettingsStorageItem =
	storage.defineItem<CompressionSettingsSchema>(DEFAULT_SETTINGS_COMPRESSION, {
		fallback: clone(DEFAULT_COMPRESSION_SETTINGS),
		init: () => clone(DEFAULT_COMPRESSION_SETTINGS),
	});

export const defaultProxySettingsStorageItem =
	storage.defineItem<ProxySettingsSchema>(DEFAULT_SETTINGS_PROXY, {
		fallback: clone(DEFAULT_PROXY_SETTINGS),
		init: () => clone(DEFAULT_PROXY_SETTINGS),
	});

export const statisticsStorageItem = storage.defineItem<StatisticsSchema>(
	STATISTICS,
	{
		fallback: clone(DEFAULT_STATISTICS),
		init: () => clone(DEFAULT_STATISTICS),
	},
);

const CACHE_SIZE = 100;

const siteSpecificStatisticsStorageItemCache =
	lru<WxtStorageItem<DetailedStatisticsSchema, Record<string, unknown>>>(
		CACHE_SIZE,
	);

const siteSpecificGeneralSettingsStorageItemCache =
	lru<WxtStorageItem<GeneralSettingsSchema, Record<string, unknown>>>(
		CACHE_SIZE,
	);

const siteSpecificCompressionSettingsStorageItemCache =
	lru<WxtStorageItem<CompressionSettingsSchema, Record<string, unknown>>>(
		CACHE_SIZE,
	);

const siteSpecificProxySettingsStorageItemCache =
	lru<WxtStorageItem<ProxySettingsSchema, Record<string, unknown>>>(CACHE_SIZE);

export const getSiteSpecificStatisticsStorageItem = (url: UrlSchema) => {
	const key =
		`${SITE_SPECIFIC_STATISTICS_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const possibleCachedStorageItem =
		siteSpecificStatisticsStorageItemCache.get(key);

	if (possibleCachedStorageItem) return possibleCachedStorageItem;

	const storageItem = storage.defineItem<DetailedStatisticsSchema>(key, {
		fallback: clone(DEFAULT_SITE_SPECIFIC_STATISTICS),
		init: () => clone(DEFAULT_SITE_SPECIFIC_STATISTICS),
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

	const storageItem = storage.defineItem<GeneralSettingsSchema>(key, {
		fallback: clone(DEFAULT_GENERAL_SETTINGS),
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

	const storageItem = storage.defineItem<CompressionSettingsSchema>(key, {
		fallback: clone(DEFAULT_COMPRESSION_SETTINGS),
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

	const storageItem = storage.defineItem<ProxySettingsSchema>(key, {
		fallback: clone(DEFAULT_PROXY_SETTINGS),
		init: defaultProxySettingsStorageItem.getValue,
	});

	siteSpecificProxySettingsStorageItemCache.set(key, storageItem);

	return storageItem;
};
