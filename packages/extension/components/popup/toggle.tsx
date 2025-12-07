import type { UrlSchema } from "@bandwidth-saver/shared";
import { type JSXElement, Show } from "solid-js";
import type { SettingsScope } from "@/models/context";
import { DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS } from "@/models/storage";
import {
	getSiteSpecificSettingsStorageItem,
	globalSettingsStorageItem,
} from "@/shared/storage";

const DEFAULT_DISABLED_GLOBAL_AND_SITE_SPECIFIC_SETTINGS = {
	block: false,
	bypassCsp: false,
	compression: false,
	proxy: false,
	saveData: false,
} as const satisfies typeof DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS;

const DEFAULT_ENABLED_GLOBAL_AND_SITE_SPECIFIC_SETTINGS = {
	block: true,
	bypassCsp: false,
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

type BaseToggleContainerProps = {
	label: JSXElement;
	checked: boolean;
	onInput: (checked: boolean) => void;
	class?: string;
};

function BaseToggleContainer(props: BaseToggleContainerProps) {
	return (
		<label class="grid w-1/2 grid-cols-[70%_1fr] items-center gap-2 space-x-2">
			<span class="label overflow-auto">{props.label}</span>

			<input
				checked={props.checked}
				class={`toggle ${props.class ?? ""}`}
				onInput={(e) => props.onInput(e.target.checked)}
				type="checkbox"
			/>
		</label>
	);
}

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
		<BaseToggleContainer
			checked={!doAllPropsMatchBoolean(props.settings, false)}
			class="toggle-primary"
			label="Enabled for all sites?"
			onInput={handleGlobalToggle}
		/>
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
		<BaseToggleContainer
			checked={!doAllPropsMatchBoolean(props.settings, false)}
			class="toggle-secondary"
			label={
				<span class="flex flex-wrap break-all">
					Enabled for <span class="text-info">{props.tabUrl}</span>
				</span>
			}
			onInput={handleSiteToggle}
		/>
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
		<BaseToggleContainer
			checked={props.settings.saveData}
			class="toggle-primary"
			label='Add "Save-Data" header?'
			onInput={handleGlobalToggle}
		/>
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
		<BaseToggleContainer
			checked={props.settings.saveData}
			class="toggle-secondary"
			label='Add "Save-Data" header?'
			onInput={handleSiteToggle}
		/>
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
