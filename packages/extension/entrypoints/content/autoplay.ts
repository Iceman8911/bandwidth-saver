import type { DEFAULT_GENERAL_SETTINGS } from "@/models/storage";
import type { ContentScriptMutationObserverCallback } from "./shared";

// Autoplay is not restored when the toggle is reversed. A page reload will be needed

export const AUTOPLAYABLE_ELEMENT_SELECTOR = "audio,video";

function isMediaElement(element: Node): element is HTMLMediaElement {
	return element instanceof HTMLMediaElement;
}

function disableAutoplay(element: HTMLMediaElement) {
	element.autoplay = false;
	element.loop = false;
	element.muted = true; // some sites re-enable autoplay unless muted
	element.pause?.();
	element.preload = "none";
	element.removeAttribute("autoplay");
	element.setAttribute("preload", "none");
}

function shouldDisableAutoplayForSite(
	defaultSettings: typeof DEFAULT_GENERAL_SETTINGS,
	siteSettings: typeof DEFAULT_GENERAL_SETTINGS,
): boolean {
	if (siteSettings.ruleIdOffset != null) {
		return siteSettings.enabled && siteSettings.noAutoplay;
	}

	return defaultSettings.enabled && defaultSettings.noAutoplay;
}

export function disableAutoplayOnPageLoad(
	defaultSettings: typeof DEFAULT_GENERAL_SETTINGS,
	siteSettings: typeof DEFAULT_GENERAL_SETTINGS,
	ele: HTMLElement,
) {
	if (!shouldDisableAutoplayForSite(defaultSettings, siteSettings)) return;

	if (isMediaElement(ele)) {
		disableAutoplay(ele);
	}
}

export const disableAutoplayFromMutationObserver: ContentScriptMutationObserverCallback =
	({ defaultSettings, ele, siteSettings }) => {
		if (!shouldDisableAutoplayForSite(defaultSettings, siteSettings)) return;

		if (isMediaElement(ele)) {
			disableAutoplay(ele);
		}
	};
