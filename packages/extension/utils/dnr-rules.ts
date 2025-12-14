import type { UrlSchema } from "@bandwidth-saver/shared";
import { DeclarativeNetRequestRuleIds } from "@/shared/constants";
import { getSiteSpecificGeneralSettingsStorageItem } from "@/shared/storage";
import { getSiteUrlOriginsFromStorage } from "./storage";

/**
 * Applies site-specific declarative net request rules to all sites with custom settings.
 *
 * @param ruleCb - Function that generates the rule for a given site URL
 */
export async function applySiteSpecificDeclarativeNetRequestRuleToCompatibleSites(
	ruleCb: (
		url: UrlSchema,
	) => Promise<Browser.declarativeNetRequest.UpdateRuleOptions>,
): Promise<void> {
	const urls = await getSiteUrlOriginsFromStorage();

	const ruleUpdatesToApply: Browser.declarativeNetRequest.UpdateRuleOptions = {
		addRules: [],
		removeRuleIds: [],
	};
	let ruleIncrementer = 0;

	for (const url of urls) {
		if (
			ruleIncrementer >=
			DeclarativeNetRequestRuleIds._DECLARATIVE_NET_REQUEST_RULE_ID_RANGE
		)
			break;

		const { useDefaultRules } =
			await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

		if (!useDefaultRules) {
			const {
				addRules: parsedRulesToAdd = [],
				removeRuleIds: parsedRuleIdsToRemove = [],
			} = await ruleCb(url);

			for (const ruleToAdd of parsedRulesToAdd) {
				ruleToAdd.id += ruleIncrementer;
				ruleToAdd.condition.initiatorDomains = [new URL(url).host]; // THe rule should only match the site it was made for

				ruleUpdatesToApply.addRules?.push(ruleToAdd);
			}

			for (let ruleIdToRemove of parsedRuleIdsToRemove) {
				ruleIdToRemove += ruleIncrementer;

				ruleUpdatesToApply.removeRuleIds?.push(ruleIdToRemove);
			}

			ruleIncrementer++;
		}
	}

	await browser.declarativeNetRequest.updateSessionRules(ruleUpdatesToApply);
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
