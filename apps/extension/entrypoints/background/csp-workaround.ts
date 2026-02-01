import { type Browser, browser } from "wxt/browser";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import type {
	DefaultDnrRuleModifierPayload,
	SiteScopedDnrRuleModifierPayloadEntry,
} from "@/utils/dnr-rules";

const REMOVE_CSP_HEADER_RULES = {
	responseHeaders: [
		{
			header: "content-security-policy",
			operation: "remove",
		},
		{
			header: "content-security-policy-report-only",
			operation: "remove",
		},
	],
	type: "modifyHeaders",
} as const satisfies Browser.declarativeNetRequest.RuleAction;

const RESOURCE_TYPES = [
	"main_frame",
	"sub_frame",
] as const satisfies Browser.declarativeNetRequest.RuleCondition["resourceTypes"];

export async function applyDefaultCspRules({
	general: { enabled, bypassCsp },
	excludedDomains,
}: DefaultDnrRuleModifierPayload): Promise<void> {
	const isEnabled = enabled && bypassCsp;

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: isEnabled
			? [
					{
						action: REMOVE_CSP_HEADER_RULES,
						condition: {
							excludedInitiatorDomains: excludedDomains.length
								? [...excludedDomains]
								: undefined,
							resourceTypes: RESOURCE_TYPES,
						},
						id: DeclarativeNetRequestRuleIds.GLOBAL_BYPASS_CSP_BLOCKING,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [DeclarativeNetRequestRuleIds.GLOBAL_BYPASS_CSP_BLOCKING],
	});
}

export async function applySiteScopedCspRules([
	host,
	{
		general: { bypassCsp, enabled, useSiteRule },
		ids: { cspBlock: cspBlockRuleId },
	},
]: SiteScopedDnrRuleModifierPayloadEntry) {
	const isEnabled = enabled && useSiteRule && bypassCsp;

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: isEnabled
			? [
					{
						action: REMOVE_CSP_HEADER_RULES,
						condition: {
							initiatorDomains: [host],
							resourceTypes: RESOURCE_TYPES,
						},
						id: cspBlockRuleId,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [cspBlockRuleId],
	});
}
