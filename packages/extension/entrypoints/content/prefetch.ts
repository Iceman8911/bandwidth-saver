import type { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";
import type { ContentScriptMutationObserverCallback } from "./shared";

export const PREFETCHABLE_ELEMENT_SELECTOR = "link";

const PREFETCH_REGEX = /prefetch|preload|prerender/i;

function isLinkElement(node: Node): node is HTMLLinkElement {
	return node instanceof HTMLLinkElement;
}

function disablePrefetch(el: HTMLLinkElement) {
	if (PREFETCH_REGEX.test(el.rel)) {
		el.remove();
	}
}

function shouldDisablePrefetchForSite(
	defaultSettings: typeof DEFAULT_GENERAL_SETTINGS,
	siteSettings: typeof DEFAULT_GENERAL_SETTINGS,
): boolean {
	if (siteSettings.ruleIdOffset != null) {
		return siteSettings.enabled && siteSettings.lazyLoad;
	}

	return defaultSettings.enabled && defaultSettings.lazyLoad;
}

export function disablePrefetchOnPageLoad(
	defaultSettings: typeof DEFAULT_GENERAL_SETTINGS,
	siteSettings: typeof DEFAULT_GENERAL_SETTINGS,
	ele: HTMLElement,
) {
	if (!shouldDisablePrefetchForSite(defaultSettings, siteSettings)) return;

	if (isLinkElement(ele)) {
		disablePrefetch(ele);
	}
}

export const disablePrefetchFromMutationObserver: ContentScriptMutationObserverCallback =
	({ defaultSettings, ele, siteSettings }) => {
		if (!shouldDisablePrefetchForSite(defaultSettings, siteSettings)) return;

		if (isLinkElement(ele)) {
			disablePrefetch(ele);
		}
	};
