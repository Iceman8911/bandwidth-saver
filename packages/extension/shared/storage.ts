import type { UrlSchema } from "@bandwidth-saver/shared";
import { clone } from "@bandwidth-saver/shared";
import { STORAGE_DEFAULTS } from "@/models/storage";
import { getUrlSchemaOrigin } from "@/utils/url";
import { StorageKey } from "./constants";

const {
	SCHEMA_VERSION,
	SETTINGS_BLOCK,
	SETTINGS_COMPRESSION,
	SETTINGS_GLOBAL,
	SETTINGS_PROXY,
	SITE_SCOPE_SETTINGS_BLOCK_PREFIX,
	SITE_SCOPE_SETTINGS_COMPRESSION_PREFIX,
	SITE_SCOPE_SETTINGS_GLOBAL_PREFIX,
	SITE_SCOPE_SETTINGS_PROXY_PREFIX,
	SITE_SCOPE_STATISTICS_PREFIX,
	STATISTICS,
} = StorageKey;

export const globalSettingsStorageItem = storage.defineItem(SETTINGS_GLOBAL, {
	fallback: clone(STORAGE_DEFAULTS[SETTINGS_GLOBAL]),
	init: () => clone(STORAGE_DEFAULTS[SETTINGS_GLOBAL]),
});

export const compressionSettingsStorageItem = storage.defineItem(
	SETTINGS_COMPRESSION,
	{
		fallback: clone(STORAGE_DEFAULTS[SETTINGS_COMPRESSION]),
		init: () => clone(STORAGE_DEFAULTS[SETTINGS_COMPRESSION]),
	},
);

export const proxySettingsStorageItem = storage.defineItem(SETTINGS_PROXY, {
	fallback: clone(STORAGE_DEFAULTS[SETTINGS_PROXY]),
	init: () => clone(STORAGE_DEFAULTS[SETTINGS_PROXY]),
});

export const blockSettingsStorageItem = storage.defineItem(SETTINGS_BLOCK, {
	fallback: clone(STORAGE_DEFAULTS[SETTINGS_BLOCK]),
	init: () => clone(STORAGE_DEFAULTS[SETTINGS_BLOCK]),
});

export const getSiteScopedBlockSettingsStorageItem = (url: UrlSchema) => {
	const key =
		`${SITE_SCOPE_SETTINGS_BLOCK_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const storageItem = storage.defineItem(key, {
		fallback: clone(STORAGE_DEFAULTS[SITE_SCOPE_SETTINGS_BLOCK_PREFIX]),
		init: () => clone(STORAGE_DEFAULTS[SITE_SCOPE_SETTINGS_BLOCK_PREFIX]),
	});

	return storageItem;
};

export const getSiteScopedCompressionSettingsStorageItem = (url: UrlSchema) => {
	const key =
		`${SITE_SCOPE_SETTINGS_COMPRESSION_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const storageItem = storage.defineItem(key, {
		fallback: clone(STORAGE_DEFAULTS[SITE_SCOPE_SETTINGS_COMPRESSION_PREFIX]),
		init: () => clone(STORAGE_DEFAULTS[SITE_SCOPE_SETTINGS_COMPRESSION_PREFIX]),
	});

	return storageItem;
};

export const getSiteScopedGlobalSettingsStorageItem = (url: UrlSchema) => {
	const key =
		`${SITE_SCOPE_SETTINGS_GLOBAL_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const storageItem = storage.defineItem(key, {
		fallback: clone(STORAGE_DEFAULTS[SITE_SCOPE_SETTINGS_GLOBAL_PREFIX]),
		init: () => clone(STORAGE_DEFAULTS[SITE_SCOPE_SETTINGS_GLOBAL_PREFIX]),
	});

	return storageItem;
};

export const getSiteScopedProxySettingsStorageItem = (url: UrlSchema) => {
	const key =
		`${SITE_SCOPE_SETTINGS_PROXY_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const storageItem = storage.defineItem(key, {
		fallback: clone(STORAGE_DEFAULTS[SITE_SCOPE_SETTINGS_PROXY_PREFIX]),
		init: () => clone(STORAGE_DEFAULTS[SITE_SCOPE_SETTINGS_PROXY_PREFIX]),
	});

	return storageItem;
};

export const statisticsStorageItem = storage.defineItem(STATISTICS, {
	fallback: clone(STORAGE_DEFAULTS[STATISTICS]),
	init: () => clone(STORAGE_DEFAULTS[STATISTICS]),
});

export const getSiteScopedStatisticsStorageItem = (url: UrlSchema) => {
	const key =
		`${SITE_SCOPE_STATISTICS_PREFIX}${getUrlSchemaOrigin(url)}` as const;

	const storageItem = storage.defineItem(key, {
		fallback: clone(STORAGE_DEFAULTS[SITE_SCOPE_STATISTICS_PREFIX]),
		init: () => clone(STORAGE_DEFAULTS[SITE_SCOPE_STATISTICS_PREFIX]),
	});

	return storageItem;
};

export const schemaVersionStorageItem = storage.defineItem(SCHEMA_VERSION, {
	fallback: clone(STORAGE_DEFAULTS[SCHEMA_VERSION]),
	init: () => clone(STORAGE_DEFAULTS[SCHEMA_VERSION]),
});
