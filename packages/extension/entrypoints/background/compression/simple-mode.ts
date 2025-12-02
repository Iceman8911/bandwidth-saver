import {
	IMAGE_COMPRESSION_URL_CONSTRUCTORS,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import type { DEFAULT_COMPRESSION_SETTINGS } from "@/models/storage";
import {
	ACTIVE_TAB_URL,
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import { declarativeNetRequestSafeUpdateDynamicRules } from "@/shared/extension-api";
import {
	compressionSettingsStorageItem,
	getSiteScopedCompressionSettingsStorageItem,
} from "@/shared/storage";

const IMAGE_URL_REGEX =
	"^https?://.+\\.(?:png|jpg|jpeg|gif|webp|avif)(\\?.*)?$";

type SiteCompressionOption = { url: UrlSchema; enabled: boolean };

async function mergeSiteOptions(
	newOptions: ReadonlyArray<SiteCompressionOption>,
): Promise<{ enabledSites: UrlSchema[]; disabledSites: UrlSchema[] }> {
	const existingRules = await browser.declarativeNetRequest.getDynamicRules();

	const oldEnabledSites = new Set<UrlSchema>();
	const oldDisabledSites = new Set<UrlSchema>();

	for (const rule of existingRules) {
		if (
			rule.id === DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_ADD
		) {
			for (const domain of rule.condition.initiatorDomains ?? []) {
				oldEnabledSites.add(domain as UrlSchema);
			}
		}
		if (
			rule.id ===
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_REMOVE
		) {
			for (const domain of rule.condition.initiatorDomains ?? []) {
				oldDisabledSites.add(domain as UrlSchema);
			}
		}
	}

	for (const { url, enabled } of newOptions) {
		if (enabled) {
			oldEnabledSites.add(url);
			oldDisabledSites.delete(url);
		} else {
			oldDisabledSites.add(url);
			oldEnabledSites.delete(url);
		}
	}

	return {
		disabledSites: Array.from(oldDisabledSites),
		enabledSites: Array.from(oldEnabledSites),
	};
}

function getGlobalCompressionRules(
	config: Omit<typeof DEFAULT_COMPRESSION_SETTINGS, "mode">,
): Browser.declarativeNetRequest.UpdateRuleOptions {
	const { enabled, format, preferredEndpoint, preserveAnim, quality } = config;

	const urlConstructor = IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];

	const preferredEndpointDomain = preferredEndpoint.replace(/^https?:\/\//, "");

	return {
		addRules: enabled
			? [
					{
						action: {
							redirect: {
								regexSubstitution: urlConstructor({
									format,
									preserveAnim,
									quality,
									url: "\\0" as UrlSchema,
								}),
							},
							type: "redirect",
						},
						condition: {
							excludedInitiatorDomains: [preferredEndpointDomain],
							excludedRequestDomains: [preferredEndpointDomain],
							regexFilter: IMAGE_URL_REGEX,
							resourceTypes: ["image"],
						},
						id: DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: [],
		removeRuleIds: [
			DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
			DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PATCH,
			DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PROXY,
			DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_MV2,
		],
	};
}

async function getSiteCompressionRules(
	urlOptions: ReadonlyArray<SiteCompressionOption>,
): Promise<Browser.declarativeNetRequest.UpdateRuleOptions> {
	const activeTabUrl = await ACTIVE_TAB_URL();

	const { format, preferredEndpoint, preserveAnim, quality } =
		await getSiteScopedCompressionSettingsStorageItem(activeTabUrl).getValue();

	const urlConstructor = IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];

	const { enabledSites, disabledSites } = await mergeSiteOptions(urlOptions);

	const rulesToAdd: Browser.declarativeNetRequest.Rule[] = [];

	if (enabledSites.length) {
		rulesToAdd.push({
			action: {
				redirect: {
					regexSubstitution: urlConstructor({
						format,
						preserveAnim,
						quality,
						url: "\\0" as UrlSchema,
					}),
				},
				type: "redirect",
			},
			condition: {
				initiatorDomains: enabledSites,
				regexFilter: IMAGE_URL_REGEX,
				resourceTypes: ["image"],
			},
			id: DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_ADD,
			priority: DeclarativeNetRequestPriority.LOW,
		});
	}

	if (disabledSites.length) {
		rulesToAdd.push({
			action: {
				type: "allow",
			},
			condition: {
				initiatorDomains: disabledSites,
				regexFilter: IMAGE_URL_REGEX,
				resourceTypes: ["image"],
			},
			id: DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_REMOVE,
			priority: DeclarativeNetRequestPriority.LOW,
		});
	}

	return {
		addRules: rulesToAdd,
		removeRuleIds: [
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_ADD,
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_REMOVE,
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PATCH_ADD,
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PATCH_REMOVE,
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY_ADD,
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY_REMOVE,
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_MV2_REMOVE,
		],
	};
}

async function toggleCompressionOnStartup() {
	const globalCompressionSettings =
		await compressionSettingsStorageItem.getValue();

	const siteCompressionOptionPromises: Promise<SiteCompressionOption>[] = [];

	for (const url of await getSiteUrlOriginsFromStorage()) {
		siteCompressionOptionPromises.push(
			getSiteScopedCompressionSettingsStorageItem(url)
				.getValue()
				.then(({ enabled }) => ({ enabled, url })),
		);
	}

	await Promise.all([
		declarativeNetRequestSafeUpdateDynamicRules(
			getGlobalCompressionRules(globalCompressionSettings),
		),
		declarativeNetRequestSafeUpdateDynamicRules(
			await getSiteCompressionRules(
				await Promise.all(siteCompressionOptionPromises),
			),
		),
	]);
}

export async function compressionModeSimpleToggleWatcher() {
	await toggleCompressionOnStartup();

	compressionSettingsStorageItem.watch((settings) => {
		declarativeNetRequestSafeUpdateDynamicRules(
			getGlobalCompressionRules(settings),
		);
	});

	watchChangesToSiteSpecificSettings(async (changes) => {
		const options = changes.reduce<SiteCompressionOption[]>(
			(options, settingsChange) => {
				if (settingsChange.type === "compression") {
					options.push({
						enabled: settingsChange.change.newValue?.enabled ?? false,
						url: settingsChange.url,
					});
				}
				return options;
			},
			[],
		);

		declarativeNetRequestSafeUpdateDynamicRules(
			await getSiteCompressionRules(options),
		);
	});
}
