import type { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";

type SettingsStorageType = typeof DEFAULT_GENERAL_SETTINGS;

export type ContentScriptMutationObserverCallback = (arg: {
	ele: Readonly<HTMLElement>;
	defaultSettings: SettingsStorageType;
	siteSettings: SettingsStorageType;
}) => void;
