import { querySelectorAllDeep } from "query-selector-shadow-dom";
import type { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";
import type { ContentScriptMutationObserverCallback } from "./shared";

// Lazyload images and iframes

type HTMLImageOrIframeElement = HTMLImageElement | HTMLIFrameElement;

function isImageOrIframeElement(node: Node): node is HTMLImageOrIframeElement {
	return node instanceof HTMLImageElement || node instanceof HTMLIFrameElement;
}

function forceLazyLoading(el: HTMLImageOrIframeElement) {
	el.loading = "lazy";
}

function shouldLazyLoadOnSite(
	defaultSettings: typeof DEFAULT_GENERAL_SETTINGS,
	siteSettings: typeof DEFAULT_GENERAL_SETTINGS,
): boolean {
	if (siteSettings.ruleIdOffset != null) {
		return siteSettings.enabled && siteSettings.lazyLoad;
	}

	return defaultSettings.enabled && defaultSettings.lazyLoad;
}

export async function forceLazyLoadingOnPageLoad(
	defaultSettings: typeof DEFAULT_GENERAL_SETTINGS,
	siteSettings: typeof DEFAULT_GENERAL_SETTINGS,
) {
	if (!shouldLazyLoadOnSite(defaultSettings, siteSettings)) return;

	querySelectorAllDeep("img,iframe").forEach((ele) => {
		if (isImageOrIframeElement(ele)) {
			forceLazyLoading(ele);
		}
	});
}

export const forceLazyLoadingFromMutationObserver: ContentScriptMutationObserverCallback =
	({ defaultSettings, node, siteSettings }) => {
		if (!shouldLazyLoadOnSite(defaultSettings, siteSettings)) return;

		if (isImageOrIframeElement(node)) {
			forceLazyLoading(node);
		}

		if (node instanceof HTMLElement) {
			querySelectorAllDeep("img,iframe", node).forEach((ele) => {
				if (isImageOrIframeElement(ele)) {
					forceLazyLoading(ele);
				}
			});
		}
	};
