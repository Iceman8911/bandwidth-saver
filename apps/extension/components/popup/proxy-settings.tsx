import type { UrlSchema } from "@bandwidth-saver/shared";
import { createStore } from "solid-js/store";
import * as v from "valibot";
import type { SettingsScope } from "@/models/context";
import {
	DEFAULT_PROXY_SETTINGS,
	STORAGE_DEFAULTS,
	STORAGE_SCHEMA,
} from "@/models/storage";
import { StorageKey } from "@/shared/constants";
import {
	defaultProxySettingsStorageItem,
	getSiteSpecificProxySettingsStorageItem,
} from "@/shared/storage";
import { convertStorageItemToReactiveSignal } from "@/utils/reactivity";

const { DEFAULT_SETTINGS_PROXY: SETTINGS_PROXY } = StorageKey;

export function PopupProxySettings(props: {
	scope: SettingsScope;
	tabUrl: UrlSchema;
	/** Accordion name */
	name: string;
}) {
	const siteSpecificProxySettingsStorageItem = () =>
		getSiteSpecificProxySettingsStorageItem(props.tabUrl);

	const defaultProxySettingsSignal = convertStorageItemToReactiveSignal(
		() => defaultProxySettingsStorageItem,
		DEFAULT_PROXY_SETTINGS,
	);

	const siteSpecificProxySettingsSignal = convertStorageItemToReactiveSignal(
		siteSpecificProxySettingsStorageItem,
		DEFAULT_PROXY_SETTINGS,
	);

	const proxySettings = () =>
		props.scope === "default"
			? defaultProxySettingsSignal()
			: siteSpecificProxySettingsSignal();

	const [tempProxySettings, setTempProxySettings] = createStore(
		proxySettings() ?? structuredClone(STORAGE_DEFAULTS[SETTINGS_PROXY]),
	);

	// Sync external proxy changes
	createEffect(on(proxySettings, (settings) => setTempProxySettings(settings)));

	const handleUpdateProxySettings = (e: Event) => {
		e.preventDefault();

		const parsedProxySettings = v.parse(
			STORAGE_SCHEMA[SETTINGS_PROXY],
			tempProxySettings,
		);

		if (props.scope === "default") {
			defaultProxySettingsStorageItem.setValue(parsedProxySettings);
		} else {
			siteSpecificProxySettingsStorageItem().setValue(parsedProxySettings);
		}
	};

	return (
		<details
			class="collapse-arrow join-item collapse border border-base-300 bg-base-100"
			name={props.name}
		>
			<summary class="collapse-title font-semibold">Proxy Settings</summary>
			<div class="collapse-content text-sm">
				<form
					class="grid grid-cols-2 gap-4"
					onSubmit={handleUpdateProxySettings}
				>
					{/* Host */}
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Host</legend>
						<input
							class="input"
							onInput={(e) => setTempProxySettings("host", e.target.value)}
							placeholder="localhost"
							type="text"
							value={tempProxySettings.host}
						/>
					</fieldset>

					{/* Port */}
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Port</legend>
						<input
							class="input"
							max={65536}
							min={0}
							onInput={(e) =>
								setTempProxySettings("port", Number(e.target.value))
							}
							placeholder="3001"
							type="number"
							value={tempProxySettings.port}
						/>
					</fieldset>

					<BaseButton class="btn-primary btn-sm self-center" type="submit">
						💾 Save Changes
					</BaseButton>
				</form>
			</div>
		</details>
	);
}
