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
	const ruleUpdatesToApply: Browser.declarativeNetRequest.UpdateRuleOptions = {
		addRules: [],
		removeRuleIds: [],
	};

	for await (const url of getSiteUrlOriginsFromStorage()) {
		const {
			addRules: parsedRulesToAdd = [],
			removeRuleIds: parsedRuleIdsToRemove = [],
		} = await ruleCb(url);

		for (const ruleToAdd of parsedRulesToAdd) {
			ruleUpdatesToApply.addRules?.push(ruleToAdd);
		}

		for (const ruleIdToRemove of parsedRuleIdsToRemove) {
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

	for await (const url of getSiteUrlOriginsFromStorage()) {
		const { ruleIdOffset } =
			await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

		if (ruleIdOffset != null) used++;
	}

	return {
		left:
			DeclarativeNetRequestRuleIds._DECLARATIVE_NET_REQUEST_RULE_ID_RANGE -
			used,
		used,
	};
}

export async function getSiteDomainsToNotApplyDefaultRule(): Promise<
	ReadonlyArray<string>
> {
	const domains: string[] = [];

	for await (const url of getSiteUrlOriginsFromStorage()) {
		const { ruleIdOffset, enabled } =
			await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

		const shouldSiteBeUnaffectedByDefaultRule =
			ruleIdOffset != null || !enabled;

		if (shouldSiteBeUnaffectedByDefaultRule) domains.push(new URL(url).host);
	}

	return domains;
}

export async function getAvailableSiteRuleIdOffset(): Promise<number | null> {
	const usedRuleIdOffsetPromises: Promise<number | null>[] = [];

	for await (const url of getSiteUrlOriginsFromStorage()) {
		usedRuleIdOffsetPromises.push(
			getSiteSpecificGeneralSettingsStorageItem(url)
				.getValue()
				.then(({ ruleIdOffset }) => ruleIdOffset),
		);
	}

	const excluded = new Set(await Promise.all(usedRuleIdOffsetPromises));
	for (
		let i = 0;
		i < DeclarativeNetRequestRuleIds._DECLARATIVE_NET_REQUEST_RULE_ID_RANGE;
		i++
	) {
		if (!excluded.has(i)) {
			return i;
		}
	}

	return null;
}
