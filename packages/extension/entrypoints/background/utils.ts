import type { UrlSchema } from "@bandwidth-saver/shared";
import type { DeclarativeNetRequestRuleIds } from "@/shared/constants";

export async function getEnabledAndDisabledDomainsFromNewAndOldSiteOptions(
	newOptions: ReadonlyArray<{ url: UrlSchema; enabled: boolean }>,
	enabledDomainRuleId: DeclarativeNetRequestRuleIds,
	disabledDomainRuleId: DeclarativeNetRequestRuleIds,
): Promise<{ enabledDomains: string[]; disabledDomains: string[] }> {
	const existingRules = await browser.declarativeNetRequest.getDynamicRules();

	const oldEnabledSites = new Set<string>();
	const oldDisabledSites = new Set<string>();

	for (const rule of existingRules) {
		if (rule.id === enabledDomainRuleId) {
			for (const domain of rule.condition.initiatorDomains ?? []) {
				oldEnabledSites.add(getHostnameForDeclarativeNetRequest(domain));
			}
		}
		if (rule.id === disabledDomainRuleId) {
			for (const domain of rule.condition.initiatorDomains ?? []) {
				oldDisabledSites.add(getHostnameForDeclarativeNetRequest(domain));
			}
		}
	}

	for (const { url, enabled } of newOptions) {
		const hostName = getHostnameForDeclarativeNetRequest(url);

		if (enabled) {
			oldEnabledSites.add(hostName);
			oldDisabledSites.delete(hostName);
		} else {
			oldDisabledSites.add(hostName);
			oldEnabledSites.delete(hostName);
		}
	}

	return {
		disabledDomains: Array.from(oldDisabledSites),
		enabledDomains: Array.from(oldEnabledSites),
	};
}
