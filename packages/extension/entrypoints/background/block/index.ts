import type * as v from "valibot";
import type { BlockedAssetSchema } from "@/models/storage";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import {
	defaultBlockSettingsStorageItem,
	getSiteSpecificBlockSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import { applySiteSpecificDeclarativeNetRequestRuleToCompatibleSites } from "@/utils/dnr-rules";
import { watchChangesToSiteSpecificSettings } from "@/utils/storage";

/**
 * Maps BlockedAssetSchema fileType values to DNR resourceTypes.
 * "media" covers both audio and video in DNR.
 */
const FILETYPE_TO_RESOURCE_TYPE: Record<string, "font" | "image" | "media"> = {
	font: "font",
	image: "image",
	media: "media",
};

/**
 * Converts a single block setting entry to a DNR rule condition/action.
 * Returns null if the entry is disabled or not representable via DNR.
 */
function convertBlockSettingToDnrRule(
	entry: v.InferOutput<typeof BlockedAssetSchema>,
	ruleId: number,
): Browser.declarativeNetRequest.Rule | null {
	if (!entry.enabled) return null;

	const condition: Browser.declarativeNetRequest.RuleCondition = {};
	const ruleAction: Browser.declarativeNetRequest.RuleAction = {
		type: "block",
	};

	switch (entry.type) {
		case "type": {
			const mapped = FILETYPE_TO_RESOURCE_TYPE[entry.fileType];
			if (!mapped) return null;
			condition.resourceTypes = [mapped];
			break;
		}
		case "ext": {
			// Block by file extension (e.g., ".mp3", ".woff")
			// Use regexFilter to match URLs ending with the extension
			const ext = entry.extension.replace(/^\./, ""); // Remove leading dot if present
			// Only allow safe characters in extension
			if (!/^[a-z0-9]+$/i.test(ext)) return null;
			condition.regexFilter = `\\.(${ext})(?:[?#].*)?$`;
			break;
		}
		case "url": {
			// Block by URL pattern (wildcards supported)
			// Convert simple wildcards to DNR urlFilter
			// DNR supports "*" as a wildcard, but not full regex
			condition.urlFilter = entry.urlPattern;
			break;
		}
		default:
			return null;
	}

	// TODO: Optionally, support minSize (bytes) if needed in the future (MV2)

	return {
		action: ruleAction,
		condition,
		id: ruleId,
		priority: DeclarativeNetRequestPriority.HIGH,
	};
}

/**
 * Converts an array of block settings to DNR rules.
 * Skips disabled or unrepresentable entries.
 */
export function blockSettingsToDnrRules(
	blockSettings: v.InferOutput<typeof BlockedAssetSchema>[],
	startingRuleId = 1,
): Browser.declarativeNetRequest.Rule[] {
	const rules: Browser.declarativeNetRequest.Rule[] = [];
	let ruleId = startingRuleId;
	for (const entry of blockSettings) {
		const rule = convertBlockSettingToDnrRule(entry, ruleId);
		if (rule) {
			rules.push(rule);
			ruleId++;
		}
	}
	return rules;
}

/**
 * Applies the given DNR rules, replacing all previous dynamic rules.
 * If ruleIds is provided, only those rules are removed before adding new ones.
 */
export async function applyBlockRules(
	rules: Browser.declarativeNetRequest.Rule[],
	ruleIds?: number[],
): Promise<void> {
	const ids = ruleIds ?? rules.map((r) => r.id);
	await browser.declarativeNetRequest.updateDynamicRules({
		addRules: rules,
		removeRuleIds: ids,
	});
}

/**
 * Loads block settings from storage and applies them as DNR rules.
 */
export async function syncBlockSettingsFromStorage(
	getBlockSettings: () => Promise<v.InferOutput<typeof BlockedAssetSchema>[]>,
	ruleIdOffset = 1,
): Promise<void> {
	const blockSettings = await getBlockSettings();
	const rules = blockSettingsToDnrRules(blockSettings, ruleIdOffset);
	await applyBlockRules(rules);
}

/**
 * Applies default/global blocking rules at startup and on changes.
 */
async function applyDefaultBlockingRules() {
	const blockSettings = await defaultBlockSettingsStorageItem.getValue();
	const rules = blockSettingsToDnrRules(
		blockSettings,
		DeclarativeNetRequestRuleIds.GLOBAL_BLOCKING,
	);
	await applyBlockRules(rules);
}

/**
 * Applies site-specific blocking rules for all known site origins atomically,
 * using the shared helper for consistency with compression/CSP.
 */
async function applyAllSiteBlockingRules() {
	await applySiteSpecificDeclarativeNetRequestRuleToCompatibleSites(
		async (url) => {
			const generalSettings =
				await getSiteSpecificGeneralSettingsStorageItem(url).getValue();
			const ruleIdOffset = generalSettings.ruleIdOffset ?? 0;
			const storageItem = getSiteSpecificBlockSettingsStorageItem(url);
			const blockSettings = await storageItem.getValue();
			const rules = blockSettingsToDnrRules(
				blockSettings,
				DeclarativeNetRequestRuleIds.SITE_BLOCKING + ruleIdOffset,
			);
			const removeRuleIds = rules.map((r) => r.id);
			return {
				addRules: rules,
				removeRuleIds,
			};
		},
	);
}

async function applyAllBlockingRules() {
	await applyDefaultBlockingRules();
	await applyAllSiteBlockingRules();
}

/**
 * Sets up watchers to keep DNR rules in sync with block settings.
 */
export async function blockingToggleWatcher() {
	await applyAllBlockingRules();

	// Watch for changes to default/global block settings
	defaultBlockSettingsStorageItem.watch(async () => {
		await applyDefaultBlockingRules();
	});

	// Watch for changes to site-specific block settings
	watchChangesToSiteSpecificSettings(async () => {
		await applyAllBlockingRules();
	});
}
