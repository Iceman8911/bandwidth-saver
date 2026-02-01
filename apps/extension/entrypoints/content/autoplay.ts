import type { GeneralSettingsSchema } from "@/models/storage";
import type { ContentScriptSettingsApplyCallback } from "./shared";

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

export function shouldDisableAutoplayForSite(
	defaultSettings: GeneralSettingsSchema,
	siteSettings: GeneralSettingsSchema,
): boolean {
	if (siteSettings.useSiteRule) {
		return siteSettings.enabled && siteSettings.noAutoplay;
	}

	return defaultSettings.enabled && defaultSettings.noAutoplay;
}

export const disableAutoplayViaContentScript: ContentScriptSettingsApplyCallback =
	({ ele, applySetting }) => {
		if (!applySetting) return;

		if (isMediaElement(ele)) {
			disableAutoplay(ele);
		}
	};
