import type { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";
import type { ContentScriptSettingsApplyCallback } from "./shared";

// Lazyload images and iframes

export const LAZY_LOADABLE_ELEMENT_SELECTOR = "img,iframe";

type HTMLImageOrIframeElement = HTMLImageElement | HTMLIFrameElement;

function isImageOrIframeElement(node: Node): node is HTMLImageOrIframeElement {
	return node instanceof HTMLImageElement || node instanceof HTMLIFrameElement;
}

function forceLazyLoading(el: HTMLImageOrIframeElement) {
	el.loading = "lazy";
}

export function shouldLazyLoadOnSite(
	defaultSettings: typeof DEFAULT_GENERAL_SETTINGS,
	siteSettings: typeof DEFAULT_GENERAL_SETTINGS,
): boolean {
	if (siteSettings.ruleIdOffset != null) {
		return siteSettings.enabled && siteSettings.lazyLoad;
	}

	return defaultSettings.enabled && defaultSettings.lazyLoad;
}

export const forceLazyLoadingViaContentScript: ContentScriptSettingsApplyCallback =
	({ ele, applySetting }) => {
		if (!applySetting) return;

		if (isImageOrIframeElement(ele)) {
			forceLazyLoading(ele);
		}
	};
