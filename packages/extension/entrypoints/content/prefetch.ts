import { querySelectorAllDeep } from "query-selector-shadow-dom";
import type { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";
import type { ContentScriptMutationObserverCallback } from "./shared";

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
) {
	if (!shouldDisablePrefetchForSite(defaultSettings, siteSettings)) return;

	querySelectorAllDeep("link").forEach((linkElement) => {
		if (isLinkElement(linkElement)) {
			disablePrefetch(linkElement);
		}
	});
}

export const disablePrefetchFromMutationObserver: ContentScriptMutationObserverCallback =
	({ defaultSettings, node, siteSettings }) => {
		if (!shouldDisablePrefetchForSite(defaultSettings, siteSettings)) return;

		if (isLinkElement(node)) {
			disablePrefetch(node);
		}

		if (node instanceof HTMLElement) {
			querySelectorAllDeep("link", node).forEach((linkElement) => {
				if (isLinkElement(linkElement)) {
					disablePrefetch(linkElement);
				}
			});
		}
	};
