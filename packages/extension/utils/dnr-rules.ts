import type { UrlSchema } from "@bandwidth-saver/shared";
import { DeclarativeNetRequestRuleIds } from "@/shared/constants";
import { getSiteSpecificGeneralSettingsStorageItem } from "@/shared/storage";
import { getSiteUrlOriginsFromStorage } from "./storage";

/**
 * Generates an array of rule IDs from a base ID to its end marker (inclusive).
 * Used to clear all rules in a range before reapplying.
 */
export function generateRuleIdRange(
	baseRuleId: number,
	endRuleId: number,
): number[] {
	const ids: number[] = [];
	for (let id = baseRuleId; id <= endRuleId; id++) {
		ids.push(id);
	}
	return ids;
}

/**
 * Applies site-specific declarative net request rules to all sites with custom settings.
 *
 * This is the generic function for non-compression features (Save-Data, CSP bypass).
 * It clears only the specific rule range for the feature before applying new rules.
 *
 * @param rule - Function that generates the rule for a given site URL
 * @param baseRuleId - The starting rule ID for this feature's site-specific rules
 * @param endRuleId - The ending rule ID for this feature's site-specific rules (inclusive)
 */
export async function applySiteSpecificDeclarativeNetRequestRuleToCompatibleSites(
	rule: (
		url: UrlSchema,
	) => Promise<Omit<Browser.declarativeNetRequest.Rule, "id">>,
	baseRuleId: number,
	endRuleId: number,
): Promise<void> {
	const urls = await getSiteUrlOriginsFromStorage();

	// Clear all rules in this feature's range to handle stale rules from removed sites
	const ruleIdsToRemove = generateRuleIdRange(baseRuleId, endRuleId);

	await browser.declarativeNetRequest.updateSessionRules({
		removeRuleIds: ruleIdsToRemove,
	});

	// Collect all rules to add
	const rulesToAdd: Browser.declarativeNetRequest.Rule[] = [];
	let ruleIncrementer = 0;

	for (const url of urls) {
		const { useDefaultRules } =
			await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

		if (!useDefaultRules) {
			const parsedRule = await rule(url);

			rulesToAdd.push({
				...parsedRule,
				condition: {
					...parsedRule.condition,
					initiatorDomains: [new URL(url).host],
				},
				id: baseRuleId + ruleIncrementer,
			});

			ruleIncrementer++;
		}
	}

	// Add all rules in a single batch for efficiency
	if (rulesToAdd.length > 0) {
		await browser.declarativeNetRequest.updateSessionRules({
			addRules: rulesToAdd,
		});
	}
}

type RuleAllocationUsage = {
	used: number;
	/** The amount of free rules left */
	left: number;
};

/**
 * Gets the current usage of site-specific rule allocations.
 * Useful for monitoring and warning when approaching rule limits.
 */
export async function getSiteSpecificRuleAllocationUsage(): Promise<RuleAllocationUsage> {
	let used = 0;

	const urls = await getSiteUrlOriginsFromStorage();

	for (const url of urls) {
		const { useDefaultRules } =
			await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

		if (!useDefaultRules) used++;
	}

	return {
		left:
			DeclarativeNetRequestRuleIds._DECLARATIVE_NET_REQUEST_RULE_ID_RANGE -
			used,
		used,
	};
}
