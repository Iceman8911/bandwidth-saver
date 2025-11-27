import type { UrlSchema } from "@bandwidth-saver/shared";
import { createMemo } from "solid-js";
import { DEFAULT_GLOBAL_SETTINGS } from "@/models/storage";
import {
	getSiteScopedGlobalSettingsStorageItem,
	globalSettingsStorageItem,
} from "@/shared/storage";

export function PopupToggles(props: { tabUrl: UrlSchema }) {
	const siteScopedGlobalSettingsStorageItem = () =>
		getSiteScopedGlobalSettingsStorageItem(props.tabUrl);

	const _globalSettings = convertStorageItemToReadonlySignal(
		globalSettingsStorageItem,
	);

	const globalSettings = () => _globalSettings() ?? DEFAULT_GLOBAL_SETTINGS;

	const _siteScopeGlobalSettingsAccessor = createMemo(() =>
		convertStorageItemToReadonlySignal(siteScopedGlobalSettingsStorageItem()),
	);

	const siteScopeGlobalSettings = () => {
		return _siteScopeGlobalSettingsAccessor()() ?? DEFAULT_GLOBAL_SETTINGS;
	};

	const isEnabledGlobally = () => globalSettings().enabled;

	const isEnabledForSite = () => siteScopeGlobalSettings().enabled;

	const handleGlobalToggle = () =>
		globalSettingsStorageItem.setValue({
			...globalSettings(),
			enabled: !isEnabledGlobally(),
		});

	const handleSiteToggle = () => {
		const settings = siteScopeGlobalSettings();

		siteScopedGlobalSettingsStorageItem().setValue({
			...settings,
			enabled: !isEnabledForSite(),
		});
	};

	return (
		<div class="flex justify-around gap-4">
			<label class="space-x-2">
				<span class="label">Enabled globally</span>

				<input
					checked={isEnabledGlobally()}
					class="toggle toggle-primary"
					onClick={handleGlobalToggle}
					type="checkbox"
				/>
			</label>

			<label class="space-x-2">
				<span class="label">Enabled on this site</span>

				<input
					checked={isEnabledForSite()}
					class="toggle toggle-secondary"
					onClick={handleSiteToggle}
					type="checkbox"
				/>
			</label>
		</div>
	);
}
