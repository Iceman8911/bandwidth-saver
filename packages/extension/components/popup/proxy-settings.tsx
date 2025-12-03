import type { UrlSchema } from "@bandwidth-saver/shared";
import { createMemo } from "solid-js";
import * as v from "valibot";
import type { SettingsScope } from "@/models/context";
import {
	DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS,
	DEFAULT_PROXY_SETTINGS,
	STORAGE_DEFAULTS,
	STORAGE_SCHEMA,
} from "@/models/storage";
import { StorageKey } from "@/shared/constants";
import {
	getSiteSpecificSettingsStorageItem,
	globalSettingsStorageItem,
	proxySettingsStorageItem,
} from "@/shared/storage";

const { SETTINGS_PROXY } = StorageKey;

export function PopupProxySettings(props: {
	scope: SettingsScope;
	tabUrl: UrlSchema;
	/** Accordion name */
	name: string;
}) {
	const siteSpecificSettingsSignal = createMemo(() => {
		const storageItem = getSiteSpecificSettingsStorageItem(props.tabUrl);
		const [signal] = convertStorageItemToReadonlySignal(
			storageItem,
			DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS,
		);
		return signal;
	});

	const siteSpecificSettings = () => siteSpecificSettingsSignal()();

	const [globalProxySettingsSignal] = convertStorageItemToReadonlySignal(
		globalSettingsStorageItem,
		DEFAULT_GLOBAL_AND_SITE_SPECIFIC_SETTINGS,
	);

	const proxyToggle = createMemo(() =>
		props.scope === "global"
			? globalProxySettingsSignal().proxy
			: siteSpecificSettings().proxy,
	);

	const [proxySettings] = convertStorageItemToReadonlySignal(
		proxySettingsStorageItem,
		DEFAULT_PROXY_SETTINGS,
	);

	const [tempProxySettings, setTempProxySettings] = createStore(
		proxySettings() ?? structuredClone(STORAGE_DEFAULTS[SETTINGS_PROXY]),
	);

	const handleUpdateGeneralProxySettings = (e: Event) => {
		e.preventDefault();

		const parsedProxySettings = v.parse(
			STORAGE_SCHEMA[SETTINGS_PROXY],
			tempProxySettings,
		);

		proxySettingsStorageItem.setValue(parsedProxySettings);
	};

	const handleUpdateProxyEnabledOrDisabled = (enabled: boolean) => {
		props.scope === "global"
			? globalSettingsStorageItem.setValue({
					...globalProxySettingsSignal(),
					proxy: enabled,
				})
			: getSiteSpecificSettingsStorageItem(props.tabUrl).setValue({
					...siteSpecificSettings(),
					proxy: enabled,
				});
	};

	// Whenever the scope is changed, refresh the displayed proxy settings
	// createEffect(
	// 	on([proxySettings, proxyToggle], ([proxySettings, proxyToggle]) => {
	// 		setTempProxySettings(proxySettings);

	// 		props.scope === "global"
	// 			? globalSettingsStorageItem.setValue({
	// 					...globalProxySettingsSignalWithDefault(),
	// 					proxy: proxyToggle,
	// 				})
	// 			: siteSpecificSettingsStorageItem().setValue({
	// 					...siteSpecificSettingsSignalWithDefault(),
	// 					proxy: proxyToggle,
	// 				});
	// 	}),
	// );

	return (
		<details
			class="collapse-arrow join-item collapse border border-base-300 bg-base-100"
			name={props.name}
		>
			<summary class="collapse-title flex justify-between font-semibold">
				<span>Proxy Settings</span>

				<label class="flex gap-2">
					<span class="label">Enabled?</span>
					<input
						checked={proxyToggle()}
						class={`toggle toggle-sm ${props.scope === "global" ? "toggle-primary" : "toggle-secondary"}`}
						onInput={(e) =>
							handleUpdateProxyEnabledOrDisabled(e.target.checked)
						}
						type="checkbox"
					/>
				</label>
			</summary>
			<div class="collapse-content text-sm">
				<form
					class="grid grid-cols-2 gap-4"
					onSubmit={handleUpdateGeneralProxySettings}
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
