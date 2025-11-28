import type { UrlSchema } from "@bandwidth-saver/shared";
import { createMemo, Show } from "solid-js";
import type { SettingsScope } from "@/models/context";
import { DEFAULT_GLOBAL_SETTINGS } from "@/models/storage";
import {
	getSiteScopedGlobalSettingsStorageItem,
	globalSettingsStorageItem,
} from "@/shared/storage";

const _globalSettings = convertStorageItemToReadonlySignal(
	globalSettingsStorageItem,
);

const siteScopedGlobalSettingsStorageItem = (tabUrl: UrlSchema) =>
	getSiteScopedGlobalSettingsStorageItem(tabUrl);

const globalSettings = () => _globalSettings() ?? DEFAULT_GLOBAL_SETTINGS;

function GlobalEnabledToggle(props: {
	settings: typeof DEFAULT_GLOBAL_SETTINGS;
}) {
	const handleGlobalToggle = () =>
		globalSettingsStorageItem.setValue({
			...props.settings,
			enabled: !props.settings.enabled,
		});

	return (
		<label class="space-x-2">
			<span class="label">Enabled globally</span>

			<input
				checked={props.settings.enabled}
				class="toggle toggle-primary"
				onInput={handleGlobalToggle}
				type="checkbox"
			/>
		</label>
	);
}

function DomainEnabledToggle(props: {
	settings: typeof DEFAULT_GLOBAL_SETTINGS;
	tabUrl: UrlSchema;
}) {
	const handleSiteToggle = () => {
		siteScopedGlobalSettingsStorageItem(props.tabUrl).setValue({
			...props.settings,
			enabled: !props.settings.enabled,
		});
	};

	return (
		<label class="space-x-2">
			<span class="label">Enabled on this site</span>

			<input
				checked={props.settings.enabled}
				class="toggle toggle-secondary"
				onInput={handleSiteToggle}
				type="checkbox"
			/>
		</label>
	);
}

function GlobalSaveDataToggle(props: {
	settings: typeof DEFAULT_GLOBAL_SETTINGS;
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
	settings: typeof DEFAULT_GLOBAL_SETTINGS;
	tabUrl: UrlSchema;
}) {
	const handleSiteToggle = () => {
		siteScopedGlobalSettingsStorageItem(props.tabUrl).setValue({
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
	const siteScopedStorageItem = () =>
		getSiteScopedGlobalSettingsStorageItem(props.tabUrl);

	const _resolvedSiteScopeGlobalSettingsAccessor = createMemo(() =>
		convertStorageItemToReadonlySignal(siteScopedStorageItem()),
	);

	const siteSettings = createMemo(
		() =>
			_resolvedSiteScopeGlobalSettingsAccessor()() ?? DEFAULT_GLOBAL_SETTINGS,
	);

	return (
		<div class="flex justify-around gap-4">
			<Show
				fallback={
					<>
						<GlobalEnabledToggle settings={globalSettings()} />
						<GlobalSaveDataToggle settings={globalSettings()} />
					</>
				}
				when={props.scope === "domain"}
			>
				<DomainEnabledToggle settings={siteSettings()} tabUrl={props.tabUrl} />
				<DomainSaveDataToggle settings={siteSettings()} tabUrl={props.tabUrl} />
			</Show>
		</div>
	);
}
