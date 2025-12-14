import {
	REDIRECTED_SEARCH_PARAM_FLAG,
	UrlSchema,
} from "@bandwidth-saver/shared";
import * as v from "valibot";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";

const HAS_REPAIRED_IMG_ELEMENT_FLAG_NAME = "bwsvr8911HasRepairedImgElement";

async function isCompressionEnabled(url: UrlSchema): Promise<boolean> {
	const [defaultSettings, siteSpecificSettings] = await Promise.all([
		defaultGeneralSettingsStorageItem.getValue(),
		getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
	]);

	if (!siteSpecificSettings.useDefaultRules)
		return siteSpecificSettings.compression;

	return defaultSettings.compression;
}

async function fixImageElementsBrokenFromFailedCompression(
	img: HTMLImageElement,
	url: UrlSchema,
): Promise<void> {
	if (!(await isCompressionEnabled(url))) return;

	img.addEventListener("error", () => {
		if (img.dataset[HAS_REPAIRED_IMG_ELEMENT_FLAG_NAME] === "true") return;

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

		console.log("new src is", img.src);

		img.dataset[HAS_REPAIRED_IMG_ELEMENT_FLAG_NAME] = "true";
	});
}

export async function fixImageElementsBrokenFromFailedCompressionOnPageLoad(
	url: UrlSchema,
) {
	document.querySelectorAll("img").forEach((img) => {
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
		node.querySelectorAll("img").forEach((img) => {
			fixImageElementsBrokenFromFailedCompression(img, url);
		});
	}
}
