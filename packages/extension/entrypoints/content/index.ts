import type { UrlSchema } from "@bandwidth-saver/shared";
import type { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";
import { getActiveTabUrl } from "@/shared/constants";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import {
	disableAutoplayFromMutationObserver,
	disableAutoplayOnPageLoad,
} from "./autoplay";
import { fixImageElementsBrokenFromFailedCompression } from "./compression-patch";
import {
	forceLazyLoadingFromMutationObserver,
	forceLazyLoadingOnPageLoad,
} from "./lazyload";
import {
	disablePrefetchFromMutationObserver,
	disablePrefetchOnPageLoad,
} from "./prefetch";
import type { ContentScriptMutationObserverCallback } from "./shared";
import { monitorBandwidthUsageViaContentScript } from "./statistics/bandwidth-monitoring";

const getDefaultAndSiteGeneralSettings = (url: UrlSchema) =>
	Promise.all([
		defaultGeneralSettingsStorageItem.getValue(),
		getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
	]);

// Add all mutation observer stuff here
const observer = (
	defaultSettings: typeof DEFAULT_GENERAL_SETTINGS,
	siteSettings: typeof DEFAULT_GENERAL_SETTINGS,
) =>
	new MutationObserver((mutationsList) => {
		for (const mutation of mutationsList) {
			if (mutation.type === "childList") {
				mutation.addedNodes.forEach((node) => {
					const arg: Parameters<ContentScriptMutationObserverCallback>[0] = {
						defaultSettings,
						node,
						siteSettings,
					};

					disableAutoplayFromMutationObserver(arg);
					disablePrefetchFromMutationObserver(arg);
					forceLazyLoadingFromMutationObserver(arg);
				});
			}
		}
	});

export default defineContentScript({
	async main() {
		const PAGE_URL = await getActiveTabUrl();

		const [defaultSettings, siteSettings] =
			await getDefaultAndSiteGeneralSettings(PAGE_URL);

		monitorBandwidthUsageViaContentScript();

		fixImageElementsBrokenFromFailedCompression(PAGE_URL);

		disableAutoplayOnPageLoad(defaultSettings, siteSettings);

		disablePrefetchOnPageLoad(defaultSettings, siteSettings);

		forceLazyLoadingOnPageLoad(defaultSettings, siteSettings);

		// Start observing the document for added nodes
		observer(defaultSettings, siteSettings).observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	},
	matches: ["<all_urls>"],
	runAt: "document_start",
});
