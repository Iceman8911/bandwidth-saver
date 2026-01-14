import type { UrlSchema } from "@bandwidth-saver/shared";
import { querySelectorAllDeep } from "query-selector-shadow-dom";

import { getActiveTabUrl } from "@/shared/constants";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import {
	AUTOPLAYABLE_ELEMENT_SELECTOR,
	disableAutoplayViaContentScript,
	shouldDisableAutoplayForSite,
} from "./autoplay";
import { fixImageElementsBrokenFromFailedCompression } from "./compression-patch";
import {
	forceLazyLoadingViaContentScript,
	LAZY_LOADABLE_ELEMENT_SELECTOR,
	shouldLazyLoadOnSite,
} from "./lazyload";
import {
	disablePrefetchViaContentScript,
	PREFETCHABLE_ELEMENT_SELECTOR,
	shouldDisablePrefetchForSite,
} from "./prefetch";
import { monitorBandwidthUsageViaContentScript } from "./statistics/bandwidth-monitoring";

type SettingsToApply = Readonly<{
	disableAutoplay: boolean;
	lazyload: boolean;
	prefetch: boolean;
}>;

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
const observer = ({ disableAutoplay, lazyload, prefetch }: SettingsToApply) =>
	new MutationObserver((mutationsList) => {
		for (const mutation of mutationsList) {
			if (mutation.type === "childList") {
				mutation.addedNodes.forEach((node) => {
					if (node instanceof HTMLElement) {
						for (const ele of queryMatchingElements(node)) {
							disableAutoplayViaContentScript({
								applySetting: disableAutoplay,
								ele,
							});

							disablePrefetchViaContentScript({
								applySetting: prefetch,
								ele,
							});

							forceLazyLoadingViaContentScript({
								applySetting: lazyload,
								ele,
							});
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

		const settingsToApply: SettingsToApply = {
			disableAutoplay: shouldDisableAutoplayForSite(
				defaultSettings,
				siteSettings,
			),
			lazyload: shouldLazyLoadOnSite(defaultSettings, siteSettings),
			prefetch: shouldDisablePrefetchForSite(defaultSettings, siteSettings),
		};

		for (const ele of queryMatchingElements(document)) {
			disableAutoplayViaContentScript({
				applySetting: settingsToApply.disableAutoplay,
				ele,
			});

			disablePrefetchViaContentScript({
				applySetting: settingsToApply.prefetch,
				ele,
			});

			forceLazyLoadingViaContentScript({
				applySetting: settingsToApply.lazyload,
				ele,
			});
		}

		// Start observing the document for added nodes
		observer(settingsToApply).observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	},
	matches: ["<all_urls>"],
	runAt: "document_start",
});
