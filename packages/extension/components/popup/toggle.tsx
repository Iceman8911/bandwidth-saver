import type { UrlSchema } from "@bandwidth-saver/shared";
import {
	globalSettingsStorageItem,
	siteScopedGlobalSettingsStorageItem,
} from "@/shared/storage";

export function PopupDisableToggles(props: { tabUrl: UrlSchema }) {
	const globalSettings = convertStorageItemToReadonlySignal(
		globalSettingsStorageItem,
	);

	const siteScopeGlobalSettings = convertStorageItemToReadonlySignal(
		siteScopedGlobalSettingsStorageItem,
	);

	const isEnabledGlobally = () => globalSettings()?.enabled;

	const isEnabledForSite = () =>
		siteScopeGlobalSettings()?.[props.tabUrl]?.enabled;

	const handleGlobalToggle = () =>
		globalSettingsStorageItem.setValue({
			...(globalSettings() ?? {}),
			enabled: !isEnabledGlobally(),
		});

	const handleSiteToggle = () => {
		const settings = siteScopeGlobalSettings();

		siteScopedGlobalSettingsStorageItem.setValue({
			...settings,
			[props.tabUrl]: {
				...settings?.[props.tabUrl],
				enabled: !isEnabledForSite(),
			},
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
