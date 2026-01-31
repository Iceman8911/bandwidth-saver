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

	if (siteSpecificSettings.useSiteRule != null)
		return siteSpecificSettings.compression && siteSpecificSettings.enabled;

	return defaultSettings.compression && defaultSettings.enabled;
}

let compressionCache: boolean | undefined;

async function repairImageElement(
	img: HTMLOrSVGImageElement,
	url: UrlSchema,
): Promise<void> {
	if (repairedImgElements.has(img)) return;

	if (compressionCache == null)
		compressionCache = await isCompressionEnabled(url);

	if (!compressionCache) return;

	if (img instanceof HTMLImageElement) {
		// Append the src and srcset so that the DNR rules won't redirect and fail again
		img.src += `#${REDIRECTED_SEARCH_PARAM_FLAG}`;

		if (img.srcset)
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
export function fixImageElementsBrokenFromFailedCompression(url: UrlSchema) {
	// Capture phase listener; resource error events don't reliably bubble, so capture is required.
	document.addEventListener(
		"error",
		(event: Event) => {
			const target = event.target as Node | null;
			if (!target) return;

			if (isHtmlOrSvgImageElement(target)) {
				repairImageElement(target, url);
			}
		},
		true,
	);
}
