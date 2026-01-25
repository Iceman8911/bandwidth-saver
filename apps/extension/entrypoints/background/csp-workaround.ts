import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import {
	defaultGeneralSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";
import { applySiteSpecificDeclarativeNetRequestRuleToCompatibleSites } from "@/utils/dnr-rules";
import { watchChangesToSiteSpecificGeneralSettings } from "@/utils/storage";

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
			const { bypassCsp, ruleIdOffset, enabled } =
				await getSiteSpecificGeneralSettingsStorageItem(url).getValue();

			const isEnabled = bypassCsp && ruleIdOffset != null && enabled;

			const initiatorDomain = new URL(url).host;

			const ruleIdWithOffset =
				DeclarativeNetRequestRuleIds.SITE_BYPASS_CSP_BLOCKING +
				(ruleIdOffset ?? 0);

			if (!isEnabled) {
				const possibleRuleToRemove = (
					await browser.declarativeNetRequest.getSessionRules()
				).find(
					({ condition: { initiatorDomains }, action: { responseHeaders } }) =>
						initiatorDomains?.[0] === initiatorDomain &&
						responseHeaders?.every(
							({ header }) =>
								header === REMOVE_CSP_HEADER_RULES.responseHeaders[0].header ||
								header === REMOVE_CSP_HEADER_RULES.responseHeaders[1].header,
						),
				);

				return {
					removeRuleIds: possibleRuleToRemove
						? [possibleRuleToRemove.id]
						: undefined,
				};
			}

			return {
				addRules: [
					{
						action: REMOVE_CSP_HEADER_RULES,
						condition: {
							resourceTypes: RESOURCE_TYPES,
						},
						id: ruleIdWithOffset,
						initiatorDomain: [initiatorDomain],
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				],
				removeRuleIds: [ruleIdWithOffset],
			};
		},
	);
}

async function toggleCspBlockingOnStartup() {
	const { bypassCsp, enabled } =
		await defaultGeneralSettingsStorageItem.getValue();

	await applyAllCspRules(bypassCsp && enabled);
}

export async function cspBypassToggleWatcher() {
	await toggleCspBlockingOnStartup();

	const defaultSettings = await defaultGeneralSettingsStorageItem.getValue();
	let cachedEnabled = defaultSettings.enabled && defaultSettings.bypassCsp;

	defaultGeneralSettingsStorageItem.watch(({ bypassCsp, enabled }) => {
		cachedEnabled = bypassCsp && enabled;
		applyDefaultCspRules(cachedEnabled);
	});

	// Reapply BOTH default and site rules when site settings change
	// This fixes stale excludedInitiatorDomains when useDefaultRules changes
	watchChangesToSiteSpecificGeneralSettings(async () => {
		await applyAllCspRules(cachedEnabled);
	});
}
