import { type Browser, browser } from "wxt/browser";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import type {
	DefaultDnrRuleModifierPayload,
	SiteScopedDnrRuleModifierPayloadEntry,
} from "@/utils/dnr-rules";

const declarativeNetRequest = browser.declarativeNetRequest;

const RESOURCE_TYPES = [
	"main_frame",
	"sub_frame",
] satisfies `${Browser.declarativeNetRequest.ResourceType}`[];

const CACHE_HEADER_REPLACE_RULE_ACTION: Browser.declarativeNetRequest.RuleAction =
	{
		responseHeaders: [
			{
				header: "cache-control",
				operation: "set",
				value: "public, max-age=0, must-revalidate",
			},
			{
				header: "Pragma",
				operation: "set",
				value: "no-cache",
			},
			{
				header: "Expires",
				operation: "set",
				value: "0",
			},
		],
		type: "modifyHeaders",
	};

export async function applyDefaultCacheHtmlBetterRules({
	general: { enabled, cacheHtmlBetter },
	excludedDomains,
}: DefaultDnrRuleModifierPayload): Promise<void> {
	const isEnabled = enabled && cacheHtmlBetter;

	await declarativeNetRequest.updateSessionRules({
		addRules: isEnabled
			? [
					{
						action: CACHE_HEADER_REPLACE_RULE_ACTION,
						condition: {
							excludedInitiatorDomains: excludedDomains.length
								? [...excludedDomains]
								: undefined,
							resourceTypes: RESOURCE_TYPES,
						},
						id: DeclarativeNetRequestRuleIds.DEFAULT_ENFORCE_CACHE_FRIENDLY_HEADERS_ON_HTML,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [
			DeclarativeNetRequestRuleIds.DEFAULT_ENFORCE_CACHE_FRIENDLY_HEADERS_ON_HTML,
		],
	});
}

export async function applySiteScopedCacheHtmlBetterRules([
	host,
	{
		general: { enabled, cacheHtmlBetter, useSiteRule },
		ids: { cacheHtmlBetter: cacheHtmlBetterId },
	},
]: SiteScopedDnrRuleModifierPayloadEntry) {
	const isEnabled = enabled && useSiteRule && cacheHtmlBetter;

	await declarativeNetRequest.updateSessionRules({
		addRules: isEnabled
			? [
					{
						action: CACHE_HEADER_REPLACE_RULE_ACTION,
						condition: {
							initiatorDomains: [host],
							resourceTypes: RESOURCE_TYPES,
						},
						id: cacheHtmlBetterId,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [cacheHtmlBetterId],
	});
}
