import type { UrlSchema } from "@bandwidth-saver/shared";
import { querySelectorAllDeep } from "query-selector-shadow-dom";
import type { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";
import { getActiveTabUrl } from "@/shared/constants";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import {
	AUTOPLAYABLE_ELEMENT_SELECTOR,
	disableAutoplayFromMutationObserver,
	disableAutoplayOnPageLoad,
} from "./autoplay";
import { fixImageElementsBrokenFromFailedCompression } from "./compression-patch";
import {
	forceLazyLoadingFromMutationObserver,
	forceLazyLoadingOnPageLoad,
	LAZY_LOADABLE_ELEMENT_SELECTOR,
} from "./lazyload";
import {
	disablePrefetchFromMutationObserver,
	disablePrefetchOnPageLoad,
	PREFETCHABLE_ELEMENT_SELECTOR,
} from "./prefetch";
import type { ContentScriptMutationObserverCallback } from "./shared";
import { monitorBandwidthUsageViaContentScript } from "./statistics/bandwidth-monitoring";

const getDefaultAndSiteGeneralSettings = (url: UrlSchema) =>
	Promise.all([
		defaultGeneralSettingsStorageItem.getValue(),
		getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
	]);

const COMBINED_NODE_SELECTOR = `${AUTOPLAYABLE_ELEMENT_SELECTOR},${LAZY_LOADABLE_ELEMENT_SELECTOR},${PREFETCHABLE_ELEMENT_SELECTOR}`;

function queryMatchingElements(
	parentNode: HTMLElement | Document,
): ReadonlyArray<HTMLElement> {
	const elements = querySelectorAllDeep(COMBINED_NODE_SELECTOR, parentNode);

	if (
		parentNode instanceof HTMLElement &&
		parentNode.matches(COMBINED_NODE_SELECTOR)
	) {
		elements.push(parentNode);
	}

	return elements;
}

// Add all mutation observer stuff here
const observer = (
	defaultSettings: typeof DEFAULT_GENERAL_SETTINGS,
	siteSettings: typeof DEFAULT_GENERAL_SETTINGS,
) =>
	new MutationObserver((mutationsList) => {
		for (const mutation of mutationsList) {
			if (mutation.type === "childList") {
				mutation.addedNodes.forEach((node) => {
					if (node instanceof HTMLElement) {
						for (const ele of queryMatchingElements(node)) {
							const arg: Parameters<ContentScriptMutationObserverCallback>[0] =
								{
									defaultSettings,
									ele,
									siteSettings,
								};

							disableAutoplayFromMutationObserver(arg);
							disablePrefetchFromMutationObserver(arg);
							forceLazyLoadingFromMutationObserver(arg);
						}
					}
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

		for (const ele of queryMatchingElements(document)) {
			disableAutoplayOnPageLoad(defaultSettings, siteSettings, ele);

			disablePrefetchOnPageLoad(defaultSettings, siteSettings, ele);

			forceLazyLoadingOnPageLoad(defaultSettings, siteSettings, ele);
		}

		// Start observing the document for added nodes
		observer(defaultSettings, siteSettings).observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	},
	matches: ["<all_urls>"],
	runAt: "document_start",
});
