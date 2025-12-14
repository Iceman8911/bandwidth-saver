import { capitalizeString, type UrlSchema } from "@bandwidth-saver/shared";
import { createAsync } from "@solidjs/router";
import { type JSXElement, Show } from "solid-js";
import type { SettingsScope } from "@/models/context";
import { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import { getSiteSpecificRuleAllocationUsage } from "@/utils/dnr-rules";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";

const DEFAULT_DISABLED_SETTINGS = {
	block: false,
	bypassCsp: false,
	compression: false,
	lazyLoad: false,
	noAutoplay: false,
	saveData: false,
	useDefaultRules: true,
} as const satisfies typeof DEFAULT_GENERAL_SETTINGS;

const DEFAULT_ENABLED_SETTINGS = {
	block: true,
	bypassCsp: false,
	compression: true,
	lazyLoad: true,
	noAutoplay: true,
	saveData: true,
	useDefaultRules: true,
} as const satisfies typeof DEFAULT_GENERAL_SETTINGS;

const doAllPropsMatchBoolean = (
	obj: Record<string, boolean>,
	boolToMatch: boolean,
): boolean => {
	for (const key in obj) {
		if (obj[key] !== boolToMatch) return false;
	}

	return true;
};

function BaseContainer(props: { children: JSXElement; class?: string }) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: <The input will be inserted later>
		<label
			class={`grid w-1/2 grid-cols-[70%_1fr] items-center gap-2 space-x-2 ${props.class || ""}`}
		>
			{props.children}
		</label>
	);
}

type BaseToggleContainerProps = {
	label: JSXElement;
	checked: boolean;
	onInput: (checked: boolean) => void;
	class?: string;
};

function BaseToggleContainer(props: BaseToggleContainerProps) {
	return (
		<BaseContainer>
			<span class="label overflow-auto">{props.label}</span>

			<input
				checked={props.checked}
				class={`toggle ${props.class ?? ""}`}
				onInput={(e) => props.onInput(e.target.checked)}
				type="checkbox"
			/>
		</BaseContainer>
	);
}

type BaseSelectContainerProps<TOption extends string> = {
	label: JSXElement;
	selected: TOption;
	onInput: (val: TOption) => void;
	class?: string;
	options: TOption[];
};

function BaseSelectContainer<TOption extends string>(
	props: BaseSelectContainerProps<TOption>,
) {
	return (
		<BaseContainer
			class={`grid-cols-[50%_1fr]! ${props.selected !== "site-specific" ? "w-full!" : ""}`}
		>
			<span class="label overflow-auto">{props.label}</span>

			<select
				class={`select ${props.class ?? ""}`}
				//@ts-expect-error This will be right in practice
				onInput={(e) => props.onInput(e.target.value)}
			>
				<Index each={props.options}>
					{(option) => (
						<option selected={props.selected === option()} value={option()}>
							{capitalizeString(option())}
						</option>
					)}
				</Index>
			</select>
		</BaseContainer>
	);
}

function DefaultEnabledToggle(props: {
	settings: typeof DEFAULT_GENERAL_SETTINGS;
}) {
	const handleDefaultToggle = (enabled: boolean) =>
		defaultGeneralSettingsStorageItem.setValue(
			enabled ? DEFAULT_ENABLED_SETTINGS : DEFAULT_DISABLED_SETTINGS,
		);

	return (
		<BaseToggleContainer
			checked={!doAllPropsMatchBoolean(props.settings, false)}
			class="toggle-primary"
			label="Enabled for all sites?"
			onInput={handleDefaultToggle}
		/>
	);
}

type SiteEnabledSelectValues = "site-specific" | "default" | "none";

function SiteEnabledSelect(props: {
	settings: typeof DEFAULT_GENERAL_SETTINGS;
	tabUrl: UrlSchema;
}) {
	const siteSpecificGeneralSettingsStorageItem = () =>
		getSiteSpecificGeneralSettingsStorageItem(props.tabUrl);

	const selectOptions = createAsync<SiteEnabledSelectValues[]>(
		async () => {
			if ((await getSiteSpecificRuleAllocationUsage()).left > 0)
				return ["default", "none", "site-specific"];

			return ["default", "none"];
		},
		{ initialValue: ["default", "none"] },
	);

	const selectedOption = (): SiteEnabledSelectValues =>
		doAllPropsMatchBoolean({ ...props.settings, useDefaultRules: false }, false)
			? "none"
			: props.settings.useDefaultRules
				? "default"
				: "site-specific";

	const handleSiteToggle = async (val: SiteEnabledSelectValues) => {
		const storageItem = siteSpecificGeneralSettingsStorageItem();
		const prevValue = await storageItem.getValue();

		storageItem.setValue(
			val === "none"
				? DEFAULT_DISABLED_SETTINGS
				: val === "site-specific"
					? { ...prevValue, useDefaultRules: false }
					: { ...prevValue, useDefaultRules: true },
		);
	};

	return (
		<BaseSelectContainer
			class="select-secondary select-sm"
			label={
				<span class="flex flex-wrap break-all">
					Mode for <span class="text-info">{props.tabUrl}</span>
				</span>
			}
			onInput={handleSiteToggle}
			options={selectOptions()}
			selected={selectedOption()}
		/>
	);
}

function DefaultSaveDataToggle(props: {
	settings: typeof DEFAULT_GENERAL_SETTINGS;
}) {
	const handleDefaultToggle = () =>
		defaultGeneralSettingsStorageItem.setValue({
			...props.settings,
			saveData: !props.settings.saveData,
		});

	return (
		<BaseToggleContainer
			checked={props.settings.saveData}
			class="toggle-primary"
			label='Add "Save-Data" header?'
			onInput={handleDefaultToggle}
		/>
	);
}

function SiteSaveDataToggle(props: {
	settings: typeof DEFAULT_GENERAL_SETTINGS;
	tabUrl: UrlSchema;
}) {
	const siteSpecificGeneralSettingsStorageItem = () =>
		getSiteSpecificGeneralSettingsStorageItem(props.tabUrl);

	const handleSiteToggle = () => {
		siteSpecificGeneralSettingsStorageItem().setValue({
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
	const siteSpecificGeneralSettingsStorageItem = () =>
		getSiteSpecificGeneralSettingsStorageItem(props.tabUrl);

	const siteSpecificGeneralSettingsSignal = convertStorageItemToReactiveSignal(
		siteSpecificGeneralSettingsStorageItem,
		DEFAULT_GENERAL_SETTINGS,
	);

	const defaultGeneralSettingsSignal = convertStorageItemToReactiveSignal(
		() => defaultGeneralSettingsStorageItem,
		DEFAULT_GENERAL_SETTINGS,
	);

	return (
		<div class="flex justify-around gap-4">
			<Show
				fallback={
					<>
						<DefaultEnabledToggle settings={defaultGeneralSettingsSignal()} />
						<DefaultSaveDataToggle settings={defaultGeneralSettingsSignal()} />
					</>
				}
				when={props.scope === "site"}
			>
				<SiteEnabledSelect
					settings={siteSpecificGeneralSettingsSignal()}
					tabUrl={props.tabUrl}
				/>
				<Show when={!siteSpecificGeneralSettingsSignal().useDefaultRules}>
					<SiteSaveDataToggle
						settings={siteSpecificGeneralSettingsSignal()}
						tabUrl={props.tabUrl}
					/>
				</Show>
			</Show>
		</div>
	);
}
