import { type Browser, browser } from "wxt/browser";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import {
	type DnrRuleModifierCallbackPayload,
	runDnrRuleModifiersOnStorageChange,
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

/**
 * Applies both default and site-specific Save-Data rules.
 * This ensures excludedInitiatorDomains stays in sync when site settings change.
 */
async function applyAllSaveDataRules(
	payload: DnrRuleModifierCallbackPayload,
): Promise<void> {
	await applyDefaultSaveDataRules(payload);
	await applySiteSaveDataRules(payload);
}

async function applyDefaultSaveDataRules(
	payload: DnrRuleModifierCallbackPayload,
): Promise<void> {
	const {
		default: {
			general: { enabled, saveData },
		},
		site: {
			priorityDomains: { all: excludedDomains },
		},
	} = payload;

	const isEnabled = enabled && saveData;

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: isEnabled
			? [
					{
						action: SAVE_DATA_RULE_ACTION,
						condition: {
							excludedInitiatorDomains: excludedDomains.length
								? excludedDomains
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

async function applySiteSaveDataRules({
	site: { originData },
}: DnrRuleModifierCallbackPayload) {
	const promises = originData.entries().map(
		async ([
			host,
			{
				data: {
					general: { enabled, saveData, useSiteRule },
				},
				ids: { saveData: saveDataId },
			},
		]) => {
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
		},
	);

	await Promise.all(promises);
}

async function toggleSaveDataOnStartup(
	payload: DnrRuleModifierCallbackPayload,
) {
	await applyAllSaveDataRules(payload);
}

let hasRunOnStartup = false;

export async function saveDataToggleWatcher(
	payload: DnrRuleModifierCallbackPayload,
) {
	if (!hasRunOnStartup) {
		await toggleSaveDataOnStartup(payload);
		hasRunOnStartup = true;
	}

	runDnrRuleModifiersOnStorageChange(async (payload) => {
		await applyAllSaveDataRules(payload);
	});
}
