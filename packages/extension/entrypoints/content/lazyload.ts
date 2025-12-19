import type { UrlSchema } from "@bandwidth-saver/shared";
import { querySelectorAllDeep } from "query-selector-shadow-dom";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";

// Lazyload images and iframes

type HTMLImageOrIframeElement = HTMLImageElement | HTMLIFrameElement;

function isImageOrIframeElement(node: Node): node is HTMLImageOrIframeElement {
	return node instanceof HTMLImageElement || node instanceof HTMLIFrameElement;
}

function forceLazyLoading(el: HTMLImageOrIframeElement) {
	el.loading = "lazy";
}

async function shouldLazyLoadOnSite(url: UrlSchema): Promise<boolean> {
	const [defaultSettings, siteSpecificSettings] = await Promise.all([
		defaultGeneralSettingsStorageItem.getValue(),
		getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
	]);

	if (siteSpecificSettings.ruleIdOffset != null) {
		return siteSpecificSettings.enabled && siteSpecificSettings.lazyLoad;
	}

	return defaultSettings.enabled && defaultSettings.lazyLoad;
}

export async function forceLazyLoadingOnPageLoad(url: UrlSchema) {
	if (!(await shouldLazyLoadOnSite(url))) return;

	querySelectorAllDeep("img,iframe").forEach((ele) => {
		if (isImageOrIframeElement(ele)) {
			forceLazyLoading(ele);
		}
	});
}

export async function forceLazyLoadingFromMutationObserver(
	node: Node,
	url: UrlSchema,
) {
	if (!(await shouldLazyLoadOnSite(url))) return;

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
}
