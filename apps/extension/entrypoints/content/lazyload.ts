import type { GeneralSettingsSchema } from "@/models/storage";
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
	defaultSettings: GeneralSettingsSchema,
	siteSettings: GeneralSettingsSchema,
): boolean {
	if (siteSettings.useSiteRule) {
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
