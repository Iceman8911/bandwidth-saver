import { capitalizeString, type UrlSchema } from "@bandwidth-saver/shared";
import { createAsync } from "@solidjs/router";
import { type JSXElement, Show } from "solid-js";
import type { SettingsScope } from "@/models/context";
import { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import {
	getAvailableSiteRuleIdOffset,
	getSiteSpecificRuleAllocationUsage,
} from "@/utils/dnr-rules";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";

// TODO: Add a tooltip for the "default", "site-specific", "disabled"

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
	selectClass?: string;
	containerClass?: string;
	options: TOption[];
};

function BaseSelectContainer<TOption extends string>(
	props: BaseSelectContainerProps<TOption>,
) {
	return (
		<BaseContainer class={`grid-cols-[50%_1fr]! ${props.containerClass ?? ""}`}>
			<span class="label overflow-auto">{props.label}</span>

			<select
				class={`select ${props.selectClass ?? ""}`}
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
	const handleDefaultToggle = async (enabled: boolean) => {
		const prevValue = await defaultGeneralSettingsStorageItem.getValue();

		defaultGeneralSettingsStorageItem.setValue({ ...prevValue, enabled });
	};

	return (
		<BaseToggleContainer
			checked={props.settings.enabled}
			class="toggle-primary"
			label="Enabled for all sites?"
			onInput={handleDefaultToggle}
		/>
	);
}

type SiteEnabledSelectValues = "site-specific" | "default" | "disabled";

function SiteEnabledSelect(props: {
	settings: typeof DEFAULT_GENERAL_SETTINGS;
	tabUrl: UrlSchema;
}) {
	const siteSpecificGeneralSettingsStorageItem = () =>
		getSiteSpecificGeneralSettingsStorageItem(props.tabUrl);

	const selectOptions = createAsync<SiteEnabledSelectValues[]>(
		async () => {
			if ((await getSiteSpecificRuleAllocationUsage()).left > 0)
				return ["default", "disabled", "site-specific"];

			return ["default", "disabled"];
		},
		{ initialValue: ["default", "disabled"] },
	);

	const selectedOption = (): SiteEnabledSelectValues =>
		!props.settings.enabled
			? "disabled"
			: props.settings.ruleIdOffset == null
				? "default"
				: "site-specific";

	const handleSiteToggle = async (val: SiteEnabledSelectValues) => {
		const storageItem = siteSpecificGeneralSettingsStorageItem();
		const prevValue = await storageItem.getValue();

		switch (val) {
			case "site-specific":
				prevValue.ruleIdOffset = await getAvailableSiteRuleIdOffset();
				prevValue.enabled = true;
				break;
			case "default":
				prevValue.ruleIdOffset = null;
				prevValue.enabled = true;
				break;
			case "disabled":
				prevValue.ruleIdOffset = null;
				prevValue.enabled = false;
				break;
		}

		storageItem.setValue(prevValue);
	};

	return (
		<BaseSelectContainer
			containerClass={selectedOption() !== "site-specific" ? "w-full" : ""}
			label={
				<span class="flex flex-wrap break-all">
					Mode for <span class="ml-2 text-info">{props.tabUrl}</span>
				</span>
			}
			onInput={handleSiteToggle}
			options={selectOptions()}
			selectClass="select-secondary select-sm"
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

	const areSiteSpecificSettingsActive = () =>
		siteSpecificGeneralSettingsSignal().ruleIdOffset != null &&
		siteSpecificGeneralSettingsSignal().enabled;

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

				<Show when={areSiteSpecificSettingsActive()}>
					<SiteSaveDataToggle
						settings={siteSpecificGeneralSettingsSignal()}
						tabUrl={props.tabUrl}
					/>
				</Show>
			</Show>
		</div>
	);
}
