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
	// Get all stored site origins and use a deterministic order
	const urls = await getSiteUrlOriginsFromStorage();
	const sortedUrls = urls.toSorted();

	const ruleUpdatesToApply: Browser.declarativeNetRequest.UpdateRuleOptions = {
		addRules: [],
		removeRuleIds: [],
	};

	for (let i = 0; i < sortedUrls.length; i++) {
		const url = sortedUrls[i];

		if (
			i >=
				DeclarativeNetRequestRuleIds._DECLARATIVE_NET_REQUEST_RULE_ID_RANGE ||
			!url
		)
			break;

		const {
			addRules: parsedRulesToAdd = [],
			removeRuleIds: parsedRuleIdsToRemove = [],
		} = await ruleCb(url);

		for (const ruleToAdd of parsedRulesToAdd) {
			ruleToAdd.id += i;
			ruleToAdd.condition.initiatorDomains = [new URL(url).host];
			ruleUpdatesToApply.addRules?.push(ruleToAdd);
		}

		for (let ruleIdToRemove of parsedRuleIdsToRemove) {
			ruleIdToRemove += i;
			ruleUpdatesToApply.removeRuleIds?.push(ruleIdToRemove);
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
