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

const RESOURCE_TYPES = Object.values(declarativeNetRequest.ResourceType);

const SAVE_DATA_HEADER = "Save-Data";

const SAVE_DATA_RULE_ACTION: Browser.declarativeNetRequest.RuleAction = {
	requestHeaders: [
		{
			header: SAVE_DATA_HEADER,
			operation: "set",
			value: "on",
		},
	],
	type: "modifyHeaders",
};

export async function applyDefaultSaveDataRules({
	general: { enabled, saveData },
	excludedDomains,
}: DefaultDnrRuleModifierPayload): Promise<void> {
	const isEnabled = enabled && saveData;

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: isEnabled
			? [
					{
						action: SAVE_DATA_RULE_ACTION,
						condition: {
							excludedInitiatorDomains: excludedDomains.length
								? [...excludedDomains]
								: undefined,
							resourceTypes: RESOURCE_TYPES,
						},
						id: DeclarativeNetRequestRuleIds.DEFAULT_SAVE_DATA_HEADER,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [DeclarativeNetRequestRuleIds.DEFAULT_SAVE_DATA_HEADER],
	});
}

export async function applySiteSaveDataRules([
	host,
	{
		general: { enabled, saveData, useSiteRule },
		ids: { saveData: saveDataId },
	},
]: SiteScopedDnrRuleModifierPayloadEntry) {
	const isEnabled = enabled && useSiteRule && saveData;

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: isEnabled
			? [
					{
						action: SAVE_DATA_RULE_ACTION,
						condition: {
							initiatorDomains: [host],
							resourceTypes: RESOURCE_TYPES,
						},
						id: saveDataId,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [saveDataId],
	});
}
