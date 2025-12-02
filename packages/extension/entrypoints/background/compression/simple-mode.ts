import {
	IMAGE_COMPRESSION_URL_CONSTRUCTORS,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import type { DEFAULT_COMPRESSION_SETTINGS } from "@/models/storage";
import {
	ACTIVE_TAB_URL,
	CompressionMode,
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import { declarativeNetRequestSafeUpdateDynamicRules } from "@/shared/extension-api";
import {
	compressionSettingsStorageItem,
	getSiteScopedCompressionSettingsStorageItem,
} from "@/shared/storage";

const { SIMPLE: SIMPLE_MODE } = CompressionMode;

const IMAGE_URL_REGEX =
	"^https?://.+\\.(?:png|jpg|jpeg|gif|webp|avif)(\\?.*)?$";

type SiteCompressionOption = { url: UrlSchema; enabled: boolean };

async function mergeSiteOptions(
	newOptions: ReadonlyArray<SiteCompressionOption>,
): Promise<{ enabledDomains: string[]; disabledDomains: string[] }> {
	const existingRules = await browser.declarativeNetRequest.getDynamicRules();

	const oldEnabledSites = new Set<string>();
	const oldDisabledSites = new Set<string>();

	for (const rule of existingRules) {
		if (
			rule.id === DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_ADD
		) {
			for (const domain of rule.condition.initiatorDomains ?? []) {
				oldEnabledSites.add(getHostnameForDeclarativeNetRequest(domain));
			}
		}
		if (
			rule.id ===
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_REMOVE
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

function getGlobalCompressionRules(
	config: typeof DEFAULT_COMPRESSION_SETTINGS,
): Browser.declarativeNetRequest.UpdateRuleOptions {
	const { enabled, format, preferredEndpoint, preserveAnim, quality, mode } =
		config;

	if (mode !== SIMPLE_MODE)
		return {
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
			],
		};

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
	// Only the active tab's settings are used because potentially generating hundreds to thousands of rules may be hectic
	const activeTabUrl = await ACTIVE_TAB_URL();

	const { format, preferredEndpoint, preserveAnim, quality } =
		await getSiteScopedCompressionSettingsStorageItem(activeTabUrl).getValue();

	const urlConstructor = IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];

	const preferredEndpointDomain = preferredEndpoint.replace(/^https?:\/\//, "");

	const { enabledDomains, disabledDomains } =
		await mergeSiteOptions(urlOptions);

	const rulesToAdd: Browser.declarativeNetRequest.Rule[] = [];

	if (enabledDomains.length) {
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
				excludedRequestDomains: [preferredEndpointDomain],
				initiatorDomains: enabledDomains,
				regexFilter: IMAGE_URL_REGEX,
				resourceTypes: ["image"],
			},
			id: DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE_ADD,
			priority: DeclarativeNetRequestPriority.LOW,
		});
	}

	if (disabledDomains.length) {
		rulesToAdd.push({
			action: {
				type: "allow",
			},
			condition: {
				initiatorDomains: disabledDomains,
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
				.then(({ enabled, mode }) => ({
					enabled: enabled && mode === SIMPLE_MODE,
					url,
				})),
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
