import type { UrlSchema } from "@bandwidth-saver/shared";
import { querySelectorAllDeep } from "query-selector-shadow-dom";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";

const PREFETCH_REGEX = /prefetch|preload|prerender/i;

function isLinkElement(node: Node): node is HTMLLinkElement {
	return node instanceof HTMLLinkElement;
}

function disablePrefetch(el: HTMLLinkElement) {
	if (PREFETCH_REGEX.test(el.rel)) {
		el.remove();
	}
}

async function getPrefetchToggleForSite(url: UrlSchema): Promise<boolean> {
	const [
		{ lazyLoad: noPrefetchToggleForDefault },
		{ lazyLoad: noPrefetchToggleForSite, ruleIdOffset },
	] = await Promise.all([
		defaultGeneralSettingsStorageItem.getValue(),
		getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
	]);

	if (ruleIdOffset != null) {
		return noPrefetchToggleForSite;
	}

	return noPrefetchToggleForDefault;
}

export async function disablePrefetchOnPageLoad(url: UrlSchema) {
	if (!(await getPrefetchToggleForSite(url))) return;

	querySelectorAllDeep("link").forEach((linkElement) => {
		if (isLinkElement(linkElement)) {
			disablePrefetch(linkElement);
		}
	});
}

export async function disablePrefetchFromMutationObserver(
	node: Node,
	url: UrlSchema,
) {
	if (!(await getPrefetchToggleForSite(url))) return;

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
}
