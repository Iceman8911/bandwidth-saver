import type { UrlSchema } from "@bandwidth-saver/shared";
import { Show } from "solid-js";
import type { SettingsScope } from "@/models/context";
import { DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS } from "@/models/storage";
import {
	getSiteSpecificSettingsStorageItem,
	globalSettingsStorageItem,
} from "@/shared/storage";

const DEFAULT_DISABLED_GLOBAL_AND_SITE_SPECIFIC_SETTINGS = {
	block: false,
	compression: false,
	proxy: false,
	saveData: false,
} as const satisfies typeof DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS;

const DEFAULT_ENABLED_GLOBAL_AND_SITE_SPECIFIC_SETTINGS = {
	block: true,
	compression: true,
	proxy: true,
	saveData: true,
} as const satisfies typeof DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS;

const doAllPropsMatchBoolean = (
	obj: Record<string, boolean>,
	boolToMatch: boolean,
): boolean => {
	for (const key in obj) {
		if (obj[key] !== boolToMatch) return false;
	}

	return true;
};

const globalSettingsStore = convertStorageItemToReadonlySignal(
	globalSettingsStorageItem,
	DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS,
);

function GlobalEnabledToggle(props: {
	settings: typeof DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS;
}) {
	const handleGlobalToggle = (enabled: boolean) =>
		globalSettingsStorageItem.setValue(
			enabled
				? DEFAULT_ENABLED_GLOBAL_AND_SITE_SPECIFIC_SETTINGS
				: DEFAULT_DISABLED_GLOBAL_AND_SITE_SPECIFIC_SETTINGS,
		);

	return (
		<label class="space-x-2">
			<span class="label">Enabled globally</span>

			<input
				checked={!doAllPropsMatchBoolean(props.settings, false)}
				class="toggle toggle-primary"
				onInput={(e) => handleGlobalToggle(e.target.checked)}
				type="checkbox"
			/>
		</label>
	);
}

function DomainEnabledToggle(props: {
	settings: typeof DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS;
	tabUrl: UrlSchema;
}) {
	const handleSiteToggle = (enabled: boolean) => {
		getSiteSpecificSettingsStorageItem(props.tabUrl).setValue(
			enabled
				? DEFAULT_ENABLED_GLOBAL_AND_SITE_SPECIFIC_SETTINGS
				: DEFAULT_DISABLED_GLOBAL_AND_SITE_SPECIFIC_SETTINGS,
		);
	};

	return (
		<label class="space-x-2">
			<span class="label">Enabled on this site</span>

			<input
				checked={!doAllPropsMatchBoolean(props.settings, false)}
				class="toggle toggle-secondary"
				onInput={(e) => handleSiteToggle(e.target.checked)}
				type="checkbox"
			/>
		</label>
	);
}

function GlobalSaveDataToggle(props: {
	settings: typeof DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS;
}) {
	const handleGlobalToggle = () =>
		globalSettingsStorageItem.setValue({
			...props.settings,
			saveData: !props.settings.saveData,
		});

	return (
		<label class="space-x-2">
			<span class="label">Add "Save-Data" header?</span>

			<input
				checked={props.settings.saveData}
				class="toggle toggle-primary"
				onInput={handleGlobalToggle}
				type="checkbox"
			/>
		</label>
	);
}

function DomainSaveDataToggle(props: {
	settings: typeof DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS;
	tabUrl: UrlSchema;
}) {
	const handleSiteToggle = () => {
		getSiteSpecificSettingsStorageItem(props.tabUrl).setValue({
			...props.settings,
			saveData: !props.settings.saveData,
		});
	};

	return (
		<label class="space-x-2">
			<span class="label">Add "Save-Data" header?</span>

			<input
				checked={props.settings.saveData}
				class="toggle toggle-secondary"
				onInput={handleSiteToggle}
				type="checkbox"
			/>
		</label>
	);
}

export function PopupToggles(props: {
	tabUrl: UrlSchema;
	scope: SettingsScope;
}) {
	const siteSpecificSettingsStorageItem = () =>
		getSiteSpecificSettingsStorageItem(props.tabUrl);

	const siteSpecificSettingsSignal = convertStorageItemToReadonlySignal(
		siteSpecificSettingsStorageItem(),
		DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS,
	);

	return (
		<div class="flex justify-around gap-4">
			<Show
				fallback={
					<>
						<GlobalEnabledToggle settings={globalSettingsStore()} />
						<GlobalSaveDataToggle settings={globalSettingsStore()} />
					</>
				}
				when={props.scope === "domain"}
			>
				<DomainEnabledToggle
					settings={siteSpecificSettingsSignal()}
					tabUrl={props.tabUrl}
				/>
				<DomainSaveDataToggle
					settings={siteSpecificSettingsSignal()}
					tabUrl={props.tabUrl}
				/>
			</Show>
		</div>
	);
}
