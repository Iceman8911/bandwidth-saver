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

async function getLazyLoadToggleForSite(url: UrlSchema): Promise<boolean> {
	const [
		{ lazyLoad: nolazyLoadToggleForDefault },
		{ lazyLoad: nolazyLoadToggleForSite, ruleIdOffset },
	] = await Promise.all([
		defaultGeneralSettingsStorageItem.getValue(),
		getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
	]);

	if (ruleIdOffset != null) {
		return nolazyLoadToggleForSite;
	}

	return nolazyLoadToggleForDefault;
}

export async function forceLazyLoadingOnPageLoad(url: UrlSchema) {
	if (!(await getLazyLoadToggleForSite(url))) return;

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
	if (!(await getLazyLoadToggleForSite(url))) return;

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
