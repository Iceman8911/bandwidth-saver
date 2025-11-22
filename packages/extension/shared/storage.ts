import type * as v from "valibot";
import { STORAGE_DEFAULTS, type STORAGE_SCHEMA } from "@/models/storage";
import { StorageKey } from "./constants";

export const globalSettingsStorageItem = storage.defineItem<
	v.InferOutput<(typeof STORAGE_SCHEMA)[typeof StorageKey.SETTINGS_GLOBAL]>
>(StorageKey.SETTINGS_GLOBAL, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_GLOBAL],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_GLOBAL],
});

export const compressionSettingsStorageItem = storage.defineItem<
	v.InferOutput<(typeof STORAGE_SCHEMA)[typeof StorageKey.SETTINGS_COMPRESSION]>
>(StorageKey.SETTINGS_COMPRESSION, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_COMPRESSION],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_COMPRESSION],
});

export const proxySettingsStorageItem = storage.defineItem<
	v.InferOutput<(typeof STORAGE_SCHEMA)[typeof StorageKey.SETTINGS_PROXY]>
>(StorageKey.SETTINGS_PROXY, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_PROXY],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_PROXY],
});

export const blockSettingsStorageItem = storage.defineItem<
	v.InferOutput<(typeof STORAGE_SCHEMA)[typeof StorageKey.SETTINGS_BLOCK]>
>(StorageKey.SETTINGS_BLOCK, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_BLOCK],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_BLOCK],
});

export const siteScopedBlockSettingsStorageItem = storage.defineItem<
	v.InferOutput<
		(typeof STORAGE_SCHEMA)[typeof StorageKey.SETTINGS_SITE_SCOPE_BLOCK]
	>
>(StorageKey.SETTINGS_SITE_SCOPE_BLOCK, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_SITE_SCOPE_BLOCK],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_SITE_SCOPE_BLOCK],
});

export const siteScopedCompressionSettingsStorageItem = storage.defineItem<
	v.InferOutput<
		(typeof STORAGE_SCHEMA)[typeof StorageKey.SETTINGS_SITE_SCOPE_COMPRESSION]
	>
>(StorageKey.SETTINGS_SITE_SCOPE_COMPRESSION, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_SITE_SCOPE_COMPRESSION],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_SITE_SCOPE_COMPRESSION],
});

export const siteScopedGlobalSettingsStorageItem = storage.defineItem<
	v.InferOutput<
		(typeof STORAGE_SCHEMA)[typeof StorageKey.SETTINGS_SITE_SCOPE_GLOBAL]
	>
>(StorageKey.SETTINGS_SITE_SCOPE_GLOBAL, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_SITE_SCOPE_GLOBAL],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_SITE_SCOPE_GLOBAL],
});

export const siteScopedProxySettingsStorageItem = storage.defineItem<
	v.InferOutput<
		(typeof STORAGE_SCHEMA)[typeof StorageKey.SETTINGS_SITE_SCOPE_PROXY]
	>
>(StorageKey.SETTINGS_SITE_SCOPE_PROXY, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_SITE_SCOPE_PROXY],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_SITE_SCOPE_PROXY],
});

export const statisticsStorageItem = storage.defineItem<
	v.InferOutput<(typeof STORAGE_SCHEMA)[typeof StorageKey.STATISTICS]>
>(StorageKey.STATISTICS, {
	fallback: STORAGE_DEFAULTS[StorageKey.STATISTICS],
	init: () => STORAGE_DEFAULTS[StorageKey.STATISTICS],
});

export const siteStatisticsStorageItem = storage.defineItem<
	v.InferOutput<
		(typeof STORAGE_SCHEMA)[typeof StorageKey.STATISTICS_SITE_SCOPE]
	>
>(StorageKey.STATISTICS_SITE_SCOPE, {
	fallback: STORAGE_DEFAULTS[StorageKey.STATISTICS_SITE_SCOPE],
	init: () => STORAGE_DEFAULTS[StorageKey.STATISTICS_SITE_SCOPE],
});

export const schemaVersionStorageItem = storage.defineItem<
	v.InferOutput<(typeof STORAGE_SCHEMA)[typeof StorageKey.SCHEMA_VERSION]>
>(StorageKey.SCHEMA_VERSION, {
	fallback: STORAGE_DEFAULTS[StorageKey.SCHEMA_VERSION],
	init: () => STORAGE_DEFAULTS[StorageKey.SCHEMA_VERSION],
});

export const denylistStorageItem = storage.defineItem<
	v.InferOutput<(typeof STORAGE_SCHEMA)[typeof StorageKey.SETTINGS_DENYLIST]>
>(StorageKey.SETTINGS_DENYLIST, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_DENYLIST],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_DENYLIST],
});
