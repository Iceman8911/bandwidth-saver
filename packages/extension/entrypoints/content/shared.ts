import type { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";

type SettingsStorageType = typeof DEFAULT_GENERAL_SETTINGS;

export type ContentScriptMutationObserverCallback = (arg: {
	node: Node;
	defaultSettings: SettingsStorageType;
	siteSettings: SettingsStorageType;
}) => void;
