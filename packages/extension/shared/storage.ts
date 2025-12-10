import type { UrlSchema } from "@bandwidth-saver/shared";
import { clone } from "@bandwidth-saver/shared";
import { STORAGE_DEFAULTS } from "@/models/storage";
import { getUrlSchemaOrigin } from "@/utils/url";
import { StorageKey } from "./constants";

const {
	SCHEMA_VERSION,
	DEFAULT_SETTINGS_BLOCK,
	DEFAULT_SETTINGS_COMPRESSION,
	DEFAULT_SETTINGS_PROXY,
	SITE_SPECIFIC_STATISTICS_PREFIX,
	DEFAULT_SETTINGS_GENERAL,
	SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX,
	STATISTICS,
	SITE_SPECIFIC_SETTINGS_BLOCK_PREFIX,
	SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX,
	SITE_SPECIFIC_SETTINGS_PROXY_PREFIX,
} = StorageKey;

export const schemaVersionStorageItem = storage.defineItem(SCHEMA_VERSION, {
	fallback: clone(STORAGE_DEFAULTS[SCHEMA_VERSION]),
	init: () => clone(STORAGE_DEFAULTS[SCHEMA_VERSION]),
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

export const defaultBlockSettingsStorageItem = storage.defineItem(
	DEFAULT_SETTINGS_BLOCK,
	{
		fallback: clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_BLOCK]),
		init: () => clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_BLOCK]),
	},
);

export const statisticsStorageItem = storage.defineItem(STATISTICS, {
	fallback: clone(STORAGE_DEFAULTS[STATISTICS]),
	init: () => clone(STORAGE_DEFAULTS[STATISTICS]),
});

export const getSiteSpecificStatisticsStorageItem = (url: UrlSchema) => {
	const key =
		`${SITE_SPECIFIC_STATISTICS_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const storageItem = storage.defineItem(key, {
		fallback: clone(STORAGE_DEFAULTS[SITE_SPECIFIC_STATISTICS_PREFIX]),
		init: () => clone(STORAGE_DEFAULTS[SITE_SPECIFIC_STATISTICS_PREFIX]),
	});

	return storageItem;
};

export const getSiteSpecificGeneralSettingsStorageItem = (url: UrlSchema) => {
	const key =
		`${SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const storageItem = storage.defineItem(key, {
		fallback: clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_GENERAL]),
		init: defaultGeneralSettingsStorageItem.getValue,
	});

	return storageItem;
};

export const getSiteSpecificBlockSettingsStorageItem = (url: UrlSchema) => {
	const key =
		`${SITE_SPECIFIC_SETTINGS_BLOCK_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const storageItem = storage.defineItem(key, {
		fallback: clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_BLOCK]),
		init: defaultBlockSettingsStorageItem.getValue,
	});

	return storageItem;
};

export const getSiteSpecificCompressionSettingsStorageItem = (
	url: UrlSchema,
) => {
	const key =
		`${SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const storageItem = storage.defineItem(key, {
		fallback: clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_COMPRESSION]),
		init: defaultCompressionSettingsStorageItem.getValue,
	});

	return storageItem;
};
export const getSiteSpecificProxySettingsStorageItem = (url: UrlSchema) => {
	const key =
		`${SITE_SPECIFIC_SETTINGS_PROXY_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const storageItem = storage.defineItem(key, {
		fallback: clone(STORAGE_DEFAULTS[DEFAULT_SETTINGS_PROXY]),
		init: defaultProxySettingsStorageItem.getValue,
	});

	return storageItem;
};
