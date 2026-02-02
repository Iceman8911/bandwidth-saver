import { type Browser, browser } from "wxt/browser";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import type {
	DefaultDnrRuleModifierPayload,
	SiteScopedDnrRuleModifierPayloadEntry,
} from "@/utils/dnr-rules";

const BLOCK_FONT_RULE_ACTION: Browser.declarativeNetRequest.RuleAction = {
	type: "block",
};

export async function applyDefaultFontBlockRules({
	general: { enabled, blockFont },
	excludedDomains,
}: DefaultDnrRuleModifierPayload): Promise<void> {
	const isEnabled = enabled && blockFont;

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: isEnabled
			? [
					{
						action: BLOCK_FONT_RULE_ACTION,
						condition: {
							excludedInitiatorDomains: excludedDomains.length
								? [...excludedDomains]
								: undefined,
							resourceTypes: ["font"],
						},
						id: DeclarativeNetRequestRuleIds.DEFAULT_FONT_BLOCKING,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [DeclarativeNetRequestRuleIds.DEFAULT_FONT_BLOCKING],
	});
}

export async function applySiteScopedFontBlockRules([
	host,
	{
		general: { enabled, blockFont, useSiteRule },
		ids: { blockFont: blockFontId },
	},
]: SiteScopedDnrRuleModifierPayloadEntry) {
	const isEnabled = enabled && useSiteRule && blockFont;

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: isEnabled
			? [
					{
						action: BLOCK_FONT_RULE_ACTION,
						condition: {
							initiatorDomains: [host],
							resourceTypes: ["font"],
						},
						id: blockFontId,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [blockFontId],
	});
}
