import type { UrlSchema } from "@bandwidth-saver/shared";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import { declarativeNetRequestSafeUpdateDynamicRules } from "@/shared/extension-api";
import {
	getSiteSpecificSettingsStorageItem,
	globalSettingsStorageItem,
} from "@/shared/storage";

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

function getGlobalCspRule(
	enabled: boolean,
): Browser.declarativeNetRequest.UpdateRuleOptions {
	return {
		addRules: enabled
			? [
					{
						action: REMOVE_CSP_HEADER_RULES,
						condition: {
							resourceTypes: RESOURCE_TYPES,
						},
						id: DeclarativeNetRequestRuleIds.GLOBAL_BYPASS_CSP_BLOCKING,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [DeclarativeNetRequestRuleIds.GLOBAL_BYPASS_CSP_BLOCKING],
	};
}

type SiteCspOption = { url: UrlSchema; enabled: boolean };

async function mergeSiteOptions(
	newOptions: ReadonlyArray<SiteCspOption>,
): Promise<{ enabledDomains: string[]; disabledDomains: string[] }> {
	const existingRules = await browser.declarativeNetRequest.getDynamicRules();

	const oldEnabledSites = new Set<string>();
	const oldDisabledSites = new Set<string>();

	for (const rule of existingRules) {
		if (rule.id === DeclarativeNetRequestRuleIds.SITE_BYPASS_CSP_BLOCKING_ADD) {
			for (const domain of rule.condition.initiatorDomains ?? []) {
				oldEnabledSites.add(getHostnameForDeclarativeNetRequest(domain));
			}
		}
		if (
			rule.id === DeclarativeNetRequestRuleIds.SITE_BYPASS_CSP_BLOCKING_REMOVE
		) {
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

async function getSiteSpecificCspRule(
	urlOptions: ReadonlyArray<SiteCspOption>,
): Promise<Browser.declarativeNetRequest.UpdateRuleOptions> {
	const { enabledDomains, disabledDomains } =
		await mergeSiteOptions(urlOptions);

	const rulesToAdd: Browser.declarativeNetRequest.Rule[] = [];

	if (enabledDomains.length) {
		rulesToAdd.push({
			action: REMOVE_CSP_HEADER_RULES,
			condition: {
				requestDomains: enabledDomains,
				resourceTypes: RESOURCE_TYPES,
			},
			id: DeclarativeNetRequestRuleIds.SITE_BYPASS_CSP_BLOCKING_ADD,
			priority: DeclarativeNetRequestPriority.LOW,
		});
	}

	if (disabledDomains.length) {
		rulesToAdd.push({
			action: { type: "allow" },
			condition: {
				requestDomains: disabledDomains,
				resourceTypes: RESOURCE_TYPES,
			},
			id: DeclarativeNetRequestRuleIds.SITE_BYPASS_CSP_BLOCKING_REMOVE,
			priority: DeclarativeNetRequestPriority.LOW,
		});
	}

	return {
		addRules: rulesToAdd.length ? rulesToAdd : undefined,
		removeRuleIds: [
			DeclarativeNetRequestRuleIds.SITE_BYPASS_CSP_BLOCKING_ADD,
			DeclarativeNetRequestRuleIds.SITE_BYPASS_CSP_BLOCKING_REMOVE,
		],
	};
}

async function toggleCspBlockingOnStartup() {
	const { bypassCsp: globallyEnabled } =
		await globalSettingsStorageItem.getValue();

	const siteCompressionOptionPromises: Promise<SiteCspOption>[] = [];

	for (const url of await getSiteUrlOriginsFromStorage()) {
		siteCompressionOptionPromises.push(
			getSiteSpecificSettingsStorageItem(url)
				.getValue()
				.then(({ bypassCsp }) => ({
					enabled: bypassCsp,
					url,
				})),
		);
	}

	await Promise.all([
		declarativeNetRequestSafeUpdateDynamicRules(
			getGlobalCspRule(globallyEnabled),
		),
		declarativeNetRequestSafeUpdateDynamicRules(
			await getSiteSpecificCspRule(
				await Promise.all(siteCompressionOptionPromises),
			),
		),
	]);
}

export async function cspBypassToggleWatcher() {
	await toggleCspBlockingOnStartup();

	globalSettingsStorageItem.watch(({ bypassCsp: isEnabled }) => {
		declarativeNetRequestSafeUpdateDynamicRules(getGlobalCspRule(isEnabled));
	});

	watchChangesToSiteSpecificSettings(async (changes) => {
		const options = changes.reduce<SiteCspOption[]>(
			(options, settingsChange) => {
				options.push({
					enabled: settingsChange.change.newValue?.bypassCsp ?? false,
					url: settingsChange.url,
				});

				return options;
			},
			[],
		);

		declarativeNetRequestSafeUpdateDynamicRules(
			await getSiteSpecificCspRule(options),
		);
	});
}
