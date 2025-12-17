import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import { applySiteSpecificDeclarativeNetRequestRuleToCompatibleSites } from "@/utils/dnr-rules";
import { watchChangesToSiteSpecificSettings } from "@/utils/storage";

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

/**
 * Applies both default and site-specific CSP bypass rules.
 * This ensures excludedInitiatorDomains stays in sync when site settings change.
 */
async function applyAllCspRules(enabled: boolean): Promise<void> {
	await applyDefaultCspRules(enabled);
	await applySiteCspRules();
}

async function applyDefaultCspRules(enabled: boolean): Promise<void> {
	const excludedDomains = [...(await getSiteDomainsToNotApplyDefaultRule())];

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: enabled
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

async function applySiteCspRules() {
	await applySiteSpecificDeclarativeNetRequestRuleToCompatibleSites(
		async (url) => {
			const { bypassCsp, ruleIdOffset } =
				await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

			const isEnabled = bypassCsp && ruleIdOffset != null;

			if (!isEnabled) {
				return {
					removeRuleIds: [
						DeclarativeNetRequestRuleIds.SITE_BYPASS_CSP_BLOCKING,
					],
				};
			}

			return {
				addRules: [
					{
						action: REMOVE_CSP_HEADER_RULES,
						condition: {
							resourceTypes: RESOURCE_TYPES,
						},
						id: DeclarativeNetRequestRuleIds.SITE_BYPASS_CSP_BLOCKING,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				],
				removeRuleIds: [DeclarativeNetRequestRuleIds.SITE_BYPASS_CSP_BLOCKING],
			};
		},
	);
}

async function toggleCspBlockingOnStartup() {
	const { bypassCsp } = await defaultGeneralSettingsStorageItem.getValue();

	const defaultCspRulePromise = applyDefaultCspRules(bypassCsp);

	const siteCspOptionPromises = applySiteCspRules();

	await Promise.all([defaultCspRulePromise, siteCspOptionPromises]);
}

export async function cspBypassToggleWatcher() {
	await toggleCspBlockingOnStartup();

	// Cache enabled state for use in site settings change handler
	let cachedEnabled = (await defaultGeneralSettingsStorageItem.getValue())
		.bypassCsp;

	defaultGeneralSettingsStorageItem.watch(({ bypassCsp }) => {
		cachedEnabled = bypassCsp;
		applyDefaultCspRules(bypassCsp);
	});

	// Reapply BOTH default and site rules when site settings change
	// This fixes stale excludedInitiatorDomains when useDefaultRules changes
	watchChangesToSiteSpecificSettings(async () => {
		await applyAllCspRules(cachedEnabled);
	});
}
