import type { UrlSchema } from "@bandwidth-saver/shared";
import { querySelectorAllDeep } from "query-selector-shadow-dom";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";

// Autoplay is not restored when the toggle is reversed. A page reload will be needed

function isMediaElement(element: Node): element is HTMLMediaElement {
	return element instanceof HTMLMediaElement;
}

function disableAutoplay(element: HTMLMediaElement) {
	element.autoplay = false;
	// element.loop = false;
	element.muted = true; // some sites re-enable autoplay unless muted
	element.pause?.();
	element.removeAttribute("autoplay");
	element.setAttribute("preload", "none");
}

async function getAutoplayToggleForSite(url: UrlSchema): Promise<boolean> {
	const [
		{ noAutoplay: noAutoplayToggleForDefault },
		{ noAutoplay: noAutoplayToggleForSite, ruleIdOffset },
	] = await Promise.all([
		defaultGeneralSettingsStorageItem.getValue(),
		getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
	]);

	if (ruleIdOffset != null) {
		return noAutoplayToggleForSite;
	}

	return noAutoplayToggleForDefault;
}

export async function disableAutoplayOnPageLoad(url: UrlSchema) {
	if (!(await getAutoplayToggleForSite(url))) return;

	querySelectorAllDeep("audio,video").forEach((mediaElement) => {
		if (isMediaElement(mediaElement)) {
			disableAutoplay(mediaElement);
		}
	});
}

export async function disableAutoplayFromMutationObserver(
	node: Node,
	url: UrlSchema,
) {
	if (!(await getAutoplayToggleForSite(url))) return;

	if (isMediaElement(node)) {
		disableAutoplay(node);
	}

	if (node instanceof HTMLElement) {
		querySelectorAllDeep("audio,video", node).forEach((mediaElement) => {
			if (isMediaElement(mediaElement)) {
				disableAutoplay(mediaElement);
			}
		});
	}
}
