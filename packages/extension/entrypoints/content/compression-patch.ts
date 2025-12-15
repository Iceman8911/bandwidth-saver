import {
	REDIRECTED_SEARCH_PARAM_FLAG,
	UrlSchema,
} from "@bandwidth-saver/shared";
import * as v from "valibot";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";

// Toggling the compression setting requires a page reload for changes to be applied

const repairedImgElements = new WeakSet<HTMLOrSVGImageElement>();

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

async function fixImageElementsBrokenFromFailedCompression(
	img: HTMLOrSVGImageElement,
	url: UrlSchema,
): Promise<void> {
	if (!compressionCache) compressionCache = await isCompressionEnabled(url);

	if (!compressionCache) return;

	function handler() {
		if (repairedImgElements.has(img)) return;

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

	img.addEventListener("error", handler, { once: true });

	// If the image already failed to load before we attached the listener,
	// naturalWidth === 0 on a completed image indicates a load failure.
	try {
		if (
			img instanceof HTMLImageElement &&
			img.complete &&
			img.naturalWidth === 0
		) {
			handler();
		}
	} catch {}
}

export async function fixImageElementsBrokenFromFailedCompressionOnPageLoad(
	url: UrlSchema,
) {
	document.querySelectorAll("img,image").forEach((img) => {
		if (isHtmlOrSvgImageElement(img))
			fixImageElementsBrokenFromFailedCompression(img, url);
	});
}

export async function fixImageElementsBrokenFromFailedCompressionFromMutationObserver(
	node: Node,
	url: UrlSchema,
) {
	if (node instanceof HTMLImageElement) {
		fixImageElementsBrokenFromFailedCompression(node, url);
	}

	if (node instanceof HTMLElement) {
		node.querySelectorAll("img,image").forEach((img) => {
			if (isHtmlOrSvgImageElement(img))
				fixImageElementsBrokenFromFailedCompression(img, url);
		});
	}
}
