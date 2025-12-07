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
import { InformativeTooltip } from "../tooltip";

const { SETTINGS_PROXY } = StorageKey;

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
