import { type Browser, browser } from "wxt/browser";
import type { GeneralSettingsOutput } from "@/models/storage";
import { MessageType } from "@/shared/constants";
import {
	onExtensionMessage,
	sendExtensionMessage,
} from "@/shared/messaging/extension";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import type { ContentScriptTogglerPayload } from "../content/shared";

type SendModeValuePayload = ContentScriptTogglerPayload["settings"] & {
	tabId: number;
};

const tabs = browser.tabs;

async function sendModeValue({
	default: defaultSettings,
	site: siteSettings,
	tabId,
}: SendModeValuePayload) {
	let mode: GeneralSettingsOutput["spoofSlowNetwork"] = "default";

	if (siteSettings.enabled && siteSettings.useSiteRule) {
		mode = siteSettings.spoofSlowNetwork;
	} else if (defaultSettings.enabled && siteSettings.enabled) {
		// if siteSettings is disabled, no change at all should be made. defaultSettings can only be applied, if the siteSettings are enabled but siteSettings.useSiteRule is disabled
		mode = defaultSettings.spoofSlowNetwork;
	}

	await sendExtensionMessage(
		MessageType.SPOOF_SLOW_NETWORK,
		{ mode, target: "content" },
		tabId,
	);
}

export async function trackAndMessageSpoofSlowNetworkChangesViaContentScript() {
	onExtensionMessage(
		MessageType.SPOOF_SLOW_NETWORK,
		async ({ data, sender: { tab } }) => {
			// Content script sent this to background so send back a message telling the content to tell the injected script to make changes (as well as setting up a watcher here to get the changes in synce)
			if (data.target === "background") {
				const tabId: number = tab?.id || 0;

				const siteSpecificGeneralSettingsStorageItem =
					getSiteSpecificGeneralSettingsStorageItem(data.origin);

				const [initialDefaultSettings, initialSiteSettings] = await Promise.all(
					[
						defaultGeneralSettingsStorageItem.getValue(),
						siteSpecificGeneralSettingsStorageItem.getValue(),
					],
				);

				await sendModeValue({
					default: initialDefaultSettings,
					site: initialSiteSettings,
					tabId,
				});

				const watchedSettings = {
					default: initialDefaultSettings,
					site: initialSiteSettings,
					tabId,
				} satisfies SendModeValuePayload;

				const defaultSettingUnwatcher = defaultGeneralSettingsStorageItem.watch(
					async (settings) => {
						watchedSettings.default = settings;

						await sendModeValue(watchedSettings);
					},
				);

				const siteSettingUnwatcher =
					siteSpecificGeneralSettingsStorageItem.watch(async (settings) => {
						watchedSettings.site = settings;

						await sendModeValue(watchedSettings);
					});

				function onUpdatedCleanupListener(
					tabIdToCheck: number,
					{ status }: Browser.tabs.OnUpdatedInfo,
				) {
					if (tabId === tabIdToCheck && status === "loading") {
						defaultSettingUnwatcher();
						siteSettingUnwatcher();
						tabs.onUpdated.removeListener(onUpdatedCleanupListener);
					}
				}
				function onRemovedCleanupListener(tabIdToCheck: number) {
					if (tabId === tabIdToCheck) {
						defaultSettingUnwatcher();
						siteSettingUnwatcher();
						tabs.onRemoved.removeListener(onRemovedCleanupListener);
					}
				}

				tabs.onUpdated.addListener(onUpdatedCleanupListener);
				tabs.onRemoved.addListener(onRemovedCleanupListener);
			}
		},
	);
}
