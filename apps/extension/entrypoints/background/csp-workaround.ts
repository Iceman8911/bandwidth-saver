import { type Browser, browser } from "wxt/browser";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import type { DnrRuleModifierCallbackPayload } from "@/utils/dnr-rules";

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

async function applyDefaultCspRules(
	payload: DnrRuleModifierCallbackPayload,
): Promise<void> {
	const {
		default: {
			general: { enabled, bypassCsp },
		},
		site: {
			priorityDomains: { all },
		},
	} = payload;

	const excludedDomains = [...all];

	const isEnabled = enabled && bypassCsp;

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: isEnabled
			? [
					{
						action: REMOVE_CSP_HEADER_RULES,
						condition: {
							excludedInitiatorDomains: excludedDomains.length
								? excludedDomains
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

async function applySiteCspRules({
	site: { originData },
}: DnrRuleModifierCallbackPayload) {
	const promises = originData.entries().map(
		async ([
			host,
			{
				data: {
					general: { bypassCsp, enabled, useSiteRule },
				},
				ids: { cspBlock: cspBlockRuleId },
			},
		]) => {
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
		},
	);

	await Promise.all(promises);
}

export async function refreshCspBlockingDnrRules(
	payload: DnrRuleModifierCallbackPayload,
) {
	await applyDefaultCspRules(payload);
	await applySiteCspRules(payload);
}
