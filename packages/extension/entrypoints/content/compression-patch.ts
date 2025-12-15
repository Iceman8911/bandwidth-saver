import {
	REDIRECTED_SEARCH_PARAM_FLAG,
	UrlSchema,
} from "@bandwidth-saver/shared";
import { querySelectorAllDeep } from "query-selector-shadow-dom";
import * as v from "valibot";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";

// Toggling the compression setting requires a page reload for changes to be applied

const repairedImgElements = new WeakSet<HTMLOrSVGImageElement>();

let globalImageErrorHandlerInstalled = false;

function isHtmlOrSvgImageElement(node: Node): node is HTMLOrSVGImageElement {
	return node instanceof HTMLImageElement || node instanceof SVGImageElement;
}

async function isCompressionEnabled(url: UrlSchema): Promise<boolean> {
	const [defaultSettings, siteSpecificSettings] = await Promise.all([
		defaultGeneralSettingsStorageItem.getValue(),
		getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
	]);

	if (!siteSpecificSettings.useDefaultRules)
		return siteSpecificSettings.compression;

	return defaultSettings.compression;
}

let compressionCache: boolean | undefined;

async function repairImageElement(
	img: HTMLOrSVGImageElement,
	url: UrlSchema,
): Promise<void> {
	if (repairedImgElements.has(img)) return;

	if (!compressionCache) compressionCache = await isCompressionEnabled(url);

	if (!compressionCache) return;

	if (img instanceof HTMLImageElement) {
		// Append the src and srcset so that the DNR rules won't redirect and fail again
		img.src += `#${REDIRECTED_SEARCH_PARAM_FLAG}`;
		img.srcset = img.srcset
			.split(" ")
			.map((urlOrSizeDefinition) => {
				const validated = v.safeParse(UrlSchema, urlOrSizeDefinition);

				if (validated.success) {
					urlOrSizeDefinition += `#${REDIRECTED_SEARCH_PARAM_FLAG}`;
				}

				return urlOrSizeDefinition;
			})
			.join(" ");
	} else {
		img.href.baseVal += `#${REDIRECTED_SEARCH_PARAM_FLAG}`;
	}

	repairedImgElements.add(img);
}

/**
 * Install a single delegated error handler to repair images when they error.
 */
function installGlobalImageErrorHandler(url: UrlSchema) {
	if (globalImageErrorHandlerInstalled) return;
	globalImageErrorHandlerInstalled = true;

	// Capture phase listener; resource error events don't reliably bubble, so capture is required.
	document.addEventListener(
		"error",
		(event: Event) => {
			const target = event.target as Node | null;
			if (!target) return;

			if (isHtmlOrSvgImageElement(target)) {
				if (target instanceof SVGImageElement) console.log("is SVG:", target);
				repairImageElement(target, url);
			}
		},
		true,
	);
}

export async function fixImageElementsBrokenFromFailedCompressionOnPageLoad(
	url: UrlSchema,
) {
	installGlobalImageErrorHandler(url);

	querySelectorAllDeep("img,image").forEach((img) => {
		if (isHtmlOrSvgImageElement(img)) {
			repairImageElement(img, url);
		}
	});
}

export async function fixImageElementsBrokenFromFailedCompressionFromMutationObserver(
	node: Node,
	url: UrlSchema,
) {
	installGlobalImageErrorHandler(url);

	if (node instanceof HTMLImageElement) {
		repairImageElement(node, url);
	}

	if (node instanceof HTMLElement) {
		querySelectorAllDeep("img,image", node).forEach((img) => {
			if (isHtmlOrSvgImageElement(img)) repairImageElement(img, url);
		});
	}
}
