import { type Browser, browser } from "wxt/browser";
import type { BlockSettingsSchema } from "@/models/storage";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import type {
	DefaultDnrRuleModifierPayload,
	SiteScopedDnrRuleModifierPayloadEntry,
} from "@/utils/dnr-rules";
import { LOCALHOST_AND_LOOPBACK_DOMAINS } from "./static-rules";

const IMAGE_EXTENSION_REGEX_PART =
	"apng|avif|bmp|cur|gif|ico|jfif|jpeg|jpg|png|svg|tif|tiff|webp";

const MEDIA_EXTENSION_REGEX_PART =
	"aac|flac|m3u8|m4a|m4v|mp3|mp4|mpeg|mpg|oga|ogg|ogv|opus|ts|wav|weba|webm|wma|wmv";

const FONT_EXTENSION_REGEX_PART = "eot|otf|ttc|ttf|woff|woff2";

const BLOCK_RULE_ACTION: Browser.declarativeNetRequest.RuleAction = {
	type: "block",
};

function getResourceTypesToBlockFromBlockSettings({
	font,
	image,
	media,
	script,
	style,
}: BlockSettingsSchema): `${Browser.declarativeNetRequest.ResourceType}`[] {
	const resourceTypes: `${Browser.declarativeNetRequest.ResourceType}`[] = [];

	if (font) resourceTypes.push("font");
	if (image) resourceTypes.push("image");
	if (media) resourceTypes.push("media");
	if (script) resourceTypes.push("script");
	if (style) resourceTypes.push("stylesheet");

	return resourceTypes;
}

function getXhrRegexFromBlockSettings({
	font,
	image,
	media,
}: BlockSettingsSchema): string | null {
	const extGroups: string[] = [];
	if (image) extGroups.push(IMAGE_EXTENSION_REGEX_PART);
	if (media) extGroups.push(MEDIA_EXTENSION_REGEX_PART);
	if (font) extGroups.push(FONT_EXTENSION_REGEX_PART);

	if (!extGroups.length) return null;

	const allExts = extGroups.join("|");
	return `.*\\.(${allExts})(?:\\?.*)?$`;
}

export async function applyDefaultBlockRules({
	general: { enabled: isEnabled },
	block: blockSettings,
	excludedDomains,
}: DefaultDnrRuleModifierPayload): Promise<void> {
	const resourceTypes = getResourceTypesToBlockFromBlockSettings(blockSettings);
	const possibleRegex = getXhrRegexFromBlockSettings(blockSettings);
	const addRules: Browser.declarativeNetRequest.Rule[] = [];

	if (isEnabled) {
		if (resourceTypes.length) {
			addRules.push({
				action: BLOCK_RULE_ACTION,
				condition: {
					excludedInitiatorDomains: excludedDomains.length
						? [...excludedDomains]
						: undefined,
					excludedRequestDomains: LOCALHOST_AND_LOOPBACK_DOMAINS,
					resourceTypes,
				},
				id: DeclarativeNetRequestRuleIds.DEFAULT_RESOURCE_TYPE_BLOCKING,
				priority: DeclarativeNetRequestPriority.HIGHEST,
			});
		}
		if (possibleRegex) {
			addRules.push({
				action: BLOCK_RULE_ACTION,
				condition: {
					excludedInitiatorDomains: excludedDomains.length
						? [...excludedDomains]
						: undefined,
					excludedRequestDomains: LOCALHOST_AND_LOOPBACK_DOMAINS,
					regexFilter: possibleRegex,
				},
				id: DeclarativeNetRequestRuleIds.DEFAULT_EXTENSION_BLOCKING,
				priority: DeclarativeNetRequestPriority.HIGHEST,
			});
		}
	}

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: addRules.length ? addRules : undefined,
		removeRuleIds: [
			DeclarativeNetRequestRuleIds.DEFAULT_RESOURCE_TYPE_BLOCKING,
			DeclarativeNetRequestRuleIds.DEFAULT_EXTENSION_BLOCKING,
		],
	});
}

export async function applySiteScopedBlockRules([
	host,
	{
		general: { enabled, useSiteRule },
		block: blockSettings,
		ids: { assetTypeBlock: assetTypeBlockId, assetExtBlock: assetExtBlockId },
	},
]: SiteScopedDnrRuleModifierPayloadEntry) {
	const isEnabled = enabled && useSiteRule;

	const resourceTypes = getResourceTypesToBlockFromBlockSettings(blockSettings);
	const possibleRegex = getXhrRegexFromBlockSettings(blockSettings);

	const addRules: Browser.declarativeNetRequest.Rule[] = [];

	if (isEnabled) {
		if (resourceTypes.length) {
			addRules.push({
				action: BLOCK_RULE_ACTION,
				condition: {
					excludedRequestDomains: LOCALHOST_AND_LOOPBACK_DOMAINS,
					initiatorDomains: [host],
					resourceTypes,
				},
				id: assetTypeBlockId,
				priority: DeclarativeNetRequestPriority.HIGHEST,
			});
		}

		if (possibleRegex) {
			addRules.push({
				action: BLOCK_RULE_ACTION,
				condition: {
					excludedRequestDomains: LOCALHOST_AND_LOOPBACK_DOMAINS,
					initiatorDomains: [host],
					regexFilter: possibleRegex,
				},
				id: assetExtBlockId,
				priority: DeclarativeNetRequestPriority.HIGHEST,
			});
		}
	}

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: addRules.length ? addRules : undefined,
		removeRuleIds: [assetTypeBlockId, assetExtBlockId],
	});
}
