import { BatchQueue, type UrlSchema } from "@bandwidth-saver/shared";
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

export default defineContentScript({
	async main() {
		const PAGE_URL = await getActiveTabUrl();

		const [defaultSettings, siteSettings] =
			await getDefaultAndSiteGeneralSettings(PAGE_URL);

		monitorBandwidthUsageViaContentScript();

		fixImageElementsBrokenFromFailedCompression(PAGE_URL);

		const { disableAutoplay, lazyload, prefetch }: SettingsToApply = {
			disableAutoplay: shouldDisableAutoplayForSite(
				defaultSettings,
				siteSettings,
			),
			lazyload: shouldLazyLoadOnSite(defaultSettings, siteSettings),
			prefetch: shouldDisablePrefetchForSite(defaultSettings, siteSettings),
		};

		// If none of the toggles are set, no use of going further
		if (!disableAutoplay && !lazyload && !prefetch) return;

		for (const ele of queryMatchingElements(document)) {
			if (disableAutoplay)
				disableAutoplayViaContentScript({
					applySetting: disableAutoplay,
					ele,
				});

			if (prefetch)
				disablePrefetchViaContentScript({
					applySetting: prefetch,
					ele,
				});

			if (lazyload)
				forceLazyLoadingViaContentScript({
					applySetting: lazyload,
					ele,
				});
		}

		const mutationBatchQueue = new BatchQueue<HTMLElement>({
			batchSize: 200,
			intervalMs: 100,
		});

		const processedElements = new WeakSet<HTMLElement>();

		mutationBatchQueue.addCallbacks((nodes) => {
			for (const node of new Set(nodes)) {
				for (const ele of queryMatchingElements(node)) {
					if (processedElements.has(ele)) continue;

					if (disableAutoplay)
						disableAutoplayViaContentScript({
							applySetting: disableAutoplay,
							ele,
						});

					if (prefetch)
						disablePrefetchViaContentScript({
							applySetting: prefetch,
							ele,
						});

					if (lazyload)
						forceLazyLoadingViaContentScript({
							applySetting: lazyload,
							ele,
						});

					processedElements.add(ele);
				}
			}
		});

		// Add all mutation observer stuff here
		const observer = new MutationObserver((mutationsList) => {
			for (const mutation of mutationsList) {
				if (mutation.type === "childList") {
					mutation.addedNodes.forEach((node) => {
						if (node instanceof HTMLElement) {
							mutationBatchQueue.enqueue(node);
						}
					});
				}
			}
		});

		// Start observing the document for added nodes
		observer.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});

		const cleanup = () => {
			try {
				observer.disconnect();
				mutationBatchQueue.stopFlush();
				mutationBatchQueue.clearCallbacks();
			} catch {}
			window.removeEventListener("pagehide", cleanup, true);
		};
		window.addEventListener("pagehide", cleanup, true);
	},
	matches: ["<all_urls>"],
	runAt: "document_start",
});
