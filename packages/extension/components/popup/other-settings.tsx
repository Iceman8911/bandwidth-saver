import type { UrlSchema } from "@bandwidth-saver/shared";
import { createMemo } from "solid-js";
import type { SettingsScope } from "@/models/context";
import {
	DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS,
	STORAGE_DEFAULTS,
} from "@/models/storage";
import { StorageKey } from "@/shared/constants";
import {
	getSiteSpecificSettingsStorageItem,
	globalSettingsStorageItem,
} from "@/shared/storage";

const { SETTINGS_PROXY } = StorageKey;

export function PopupOtherSettings(props: {
	scope: SettingsScope;
	tabUrl: UrlSchema;
	/** Accordion name */
	name: string;
}) {
	const siteSpecificSettingsStorageItem = () =>
		getSiteSpecificSettingsStorageItem(props.tabUrl);

	const siteSpecificSettingsSignal = convertStorageItemToReadonlySignal(
		siteSpecificSettingsStorageItem(),
		DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS,
	);

	const globalSettingsSignal = convertStorageItemToReadonlySignal(
		globalSettingsStorageItem,
		DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS,
	);

	const originalSettings = createMemo(() =>
		props.scope === "global"
			? globalSettingsSignal()
			: siteSpecificSettingsSignal(),
	);

	const [tempSettings, setTempSettings] = createStore(
		originalSettings() ?? structuredClone(STORAGE_DEFAULTS[SETTINGS_PROXY]),
	);

	// Sync external proxy changes
	createEffect(on(originalSettings, (settings) => setTempSettings(settings)));

	const handleUpdateSettings = (e: Event) => {
		e.preventDefault();

		props.scope === "global"
			? globalSettingsStorageItem.setValue(tempSettings)
			: getSiteSpecificSettingsStorageItem(props.tabUrl).setValue(tempSettings);
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
					{/* TODO: Put a big o'l warning here */}
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Bypass CSP</legend>
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
