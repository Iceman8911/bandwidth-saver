import type { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";
import type { ContentScriptSettingsApplyCallback } from "./shared";

export const PREFETCHABLE_ELEMENT_SELECTOR = "link";

const PREFETCH_REGEX = /prefetch|prerender/i;

function isLinkElement(node: Node): node is HTMLLinkElement {
	return node instanceof HTMLLinkElement;
}

function disablePrefetch(el: HTMLLinkElement) {
	if (PREFETCH_REGEX.test(el.rel)) {
		el.remove();
	}
}

export function shouldDisablePrefetchForSite(
	defaultSettings: typeof DEFAULT_GENERAL_SETTINGS,
	siteSettings: typeof DEFAULT_GENERAL_SETTINGS,
): boolean {
	if (siteSettings.ruleIdOffset != null) {
		return siteSettings.enabled && siteSettings.lazyLoad;
	}

	return defaultSettings.enabled && defaultSettings.lazyLoad;
}

export const disablePrefetchViaContentScript: ContentScriptSettingsApplyCallback =
	({ ele, applySetting }) => {
		if (!applySetting) return;

		if (isLinkElement(ele)) {
			disablePrefetch(ele);
		}
	};
