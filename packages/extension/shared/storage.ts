import { STORAGE_DEFAULTS, type STORAGE_SCHEMA } from "@/models/storage";
import { StorageKey } from "./constants";

export const compressionSettingsStorageItem = storage.defineItem<
	STORAGE_SCHEMA[typeof StorageKey.SETTINGS_COMPRESSION]
>(StorageKey.SETTINGS_COMPRESSION, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_COMPRESSION],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_COMPRESSION],
});

export const proxySettingsStorageItem = storage.defineItem<
	STORAGE_SCHEMA[typeof StorageKey.SETTINGS_PROXY]
>(StorageKey.SETTINGS_PROXY, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_PROXY],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_PROXY],
});

export const blockSettingsStorageItem = storage.defineItem<
	STORAGE_SCHEMA[typeof StorageKey.SETTINGS_BLOCK]
>(StorageKey.SETTINGS_BLOCK, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_BLOCK],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_BLOCK],
});

export const siteScopeSettingsStorageItem = storage.defineItem<
	STORAGE_SCHEMA[typeof StorageKey.SETTINGS_SITE_SCOPE]
>(StorageKey.SETTINGS_SITE_SCOPE, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_SITE_SCOPE],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_SITE_SCOPE],
});

export const statisticsStorageItem = storage.defineItem<
	STORAGE_SCHEMA[typeof StorageKey.SETTINGS_STATISTICS]
>(StorageKey.SETTINGS_STATISTICS, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_STATISTICS],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_STATISTICS],
});

export const schemaVersionStorageItem = storage.defineItem<
	STORAGE_SCHEMA[typeof StorageKey.SCHEMA_VERSION]
>(StorageKey.SCHEMA_VERSION, {
	fallback: STORAGE_DEFAULTS[StorageKey.SCHEMA_VERSION],
	init: () => STORAGE_DEFAULTS[StorageKey.SCHEMA_VERSION],
});

export const denylistStorageItem = storage.defineItem<
	STORAGE_SCHEMA[typeof StorageKey.SETTINGS_DENYLIST]
>(StorageKey.SETTINGS_DENYLIST, {
	fallback: STORAGE_DEFAULTS[StorageKey.SETTINGS_DENYLIST],
	init: () => STORAGE_DEFAULTS[StorageKey.SETTINGS_DENYLIST],
});
