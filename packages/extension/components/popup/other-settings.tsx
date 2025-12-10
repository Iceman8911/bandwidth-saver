import type { UrlSchema } from "@bandwidth-saver/shared";
import { createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import type { SettingsScope } from "@/models/context";
import { DEFAULT_GENERAL_SETTINGS, STORAGE_DEFAULTS } from "@/models/storage";
import { StorageKey } from "@/shared/constants";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";
import { InformativeTooltip } from "../tooltip";

const { DEFAULT_SETTINGS_PROXY: SETTINGS_PROXY } = StorageKey;

function CspBypassTooltip() {
	return (
		<InformativeTooltip
			dir="right"
			tip={
				<div class="max-w-44 space-y-2 text-error text-xs">
					<p>
						This <strong>WILL</strong> weaken the site's security and make it
						more susceptible to XSS attacks.
					</p>

					<p>
						{" "}
						Do <strong>NOT</strong> enable this unless you know what you're
						doing.
					</p>
				</div>
			}
		/>
	);
}

export function PopupOtherSettings(props: {
	scope: SettingsScope;
	tabUrl: UrlSchema;
	/** Accordion name */
	name: string;
}) {
	const siteSpecificSettingsStorageItem = () =>
		getSiteSpecificGeneralSettingsStorageItem(props.tabUrl);

	const siteSpecificSettingsSignal = convertStorageItemToReactiveSignal(
		siteSpecificSettingsStorageItem,
		DEFAULT_GENERAL_SETTINGS,
	);

	const defaultSettingsSignal = convertStorageItemToReactiveSignal(
		() => defaultGeneralSettingsStorageItem,
		DEFAULT_GENERAL_SETTINGS,
	);

	const originalSettings = createMemo(() =>
		props.scope === "default"
			? defaultSettingsSignal()
			: siteSpecificSettingsSignal(),
	);

	const [tempSettings, setTempSettings] = createStore(
		originalSettings() ?? structuredClone(STORAGE_DEFAULTS[SETTINGS_PROXY]),
	);

	// Sync external changes
	createEffect(on(originalSettings, (settings) => setTempSettings(settings)));

	const handleUpdateSettings = (e: Event) => {
		e.preventDefault();

		if (props.scope === "default") {
			defaultGeneralSettingsStorageItem.setValue(tempSettings);
		} else {
			siteSpecificSettingsStorageItem().setValue(tempSettings);
		}
	};

	return (
		<details
			class="collapse-arrow join-item collapse border border-base-300 bg-base-100"
			name={props.name}
		>
			<summary class="collapse-title flex justify-between font-semibold">
				Other Settings
			</summary>
			<div class="collapse-content text-sm">
				<form class="grid grid-cols-2 gap-4" onSubmit={handleUpdateSettings}>
					{/* CSP Bypass Toggle */}
					<fieldset class="fieldset">
						<legend class="fieldset-legend">
							<span>Bypass CSP</span>

							<CspBypassTooltip />
						</legend>
						<input
							checked={tempSettings.bypassCsp}
							class="toggle toggle-error"
							max={100}
							min={0}
							onInput={(e) => setTempSettings("bypassCsp", e.target.checked)}
							type="checkbox"
						/>
					</fieldset>

					<BaseButton
						class="btn-primary btn-sm place-self-center"
						type="submit"
					>
						Save Changes
					</BaseButton>
				</form>
			</div>
		</details>
	);
}
