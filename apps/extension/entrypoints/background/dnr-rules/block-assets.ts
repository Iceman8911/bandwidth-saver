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

export async function applyDefaultBlockRules({
	general: { enabled: isEnabled },
	block,
	excludedDomains,
}: DefaultDnrRuleModifierPayload): Promise<void> {
	const resourceTypes = getResourceTypesToBlockFromBlockSettings(block);

	await browser.declarativeNetRequest.updateSessionRules({
		addRules:
			isEnabled && resourceTypes.length
				? [
						{
							action: BLOCK_RULE_ACTION,
							condition: {
								excludedInitiatorDomains: excludedDomains.length
									? [...excludedDomains]
									: undefined,
								resourceTypes,
							},
							id: DeclarativeNetRequestRuleIds.DEFAULT_FONT_BLOCKING,
							priority: DeclarativeNetRequestPriority.HIGHEST,
						},
					]
				: undefined,
		removeRuleIds: [DeclarativeNetRequestRuleIds.DEFAULT_FONT_BLOCKING],
	});
}

export async function applySiteScopedBlockRules([
	host,
	{
		general: { enabled, useSiteRule },
		block,
		ids: { assetBlock: assetBlockId },
	},
]: SiteScopedDnrRuleModifierPayloadEntry) {
	const isEnabled = enabled && useSiteRule;

	const resourceTypes = getResourceTypesToBlockFromBlockSettings(block);

	await browser.declarativeNetRequest.updateSessionRules({
		addRules:
			isEnabled && resourceTypes.length
				? [
						{
							action: BLOCK_RULE_ACTION,
							condition: {
								initiatorDomains: [host],
								resourceTypes,
							},
							id: assetBlockId,
							priority: DeclarativeNetRequestPriority.HIGHEST,
						},
					]
				: undefined,
		removeRuleIds: [assetBlockId],
	});
}
