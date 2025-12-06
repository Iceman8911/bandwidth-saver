import {
	IMAGE_COMPRESSION_URL_CONSTRUCTORS,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import type { DEFAULT_COMPRESSION_SETTINGS } from "@/models/storage";
import {
	CompressionMode,
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import { declarativeNetRequestSafeUpdateDynamicRules } from "@/shared/extension-api";
import {
	compressionSettingsStorageItem,
	getSiteSpecificSettingsStorageItem,
	globalSettingsStorageItem,
} from "@/shared/storage";

const { SIMPLE: SIMPLE_MODE } = CompressionMode;

const REDIRECTED_FLAG = "bandwidth-saver-flag-8911=no-redirect";

const IMAGE_URL_REGEX =
	"(https?://.+\\.(png|jpg|jpeg|gif|webp|avif))(?:\\?.*)?$";

const BASE_URL_WITHOUT_QUERY_STRING = "\\1" as UrlSchema;

const BASE_URL_WITH_FLAG = `\\1#${REDIRECTED_FLAG}` as UrlSchema;

const WHITELISTED_REQUEST_DOMAINS = [
	"cloudinary.com",
	"reddit.com",
	"preview.redd.it",
	"styles.redditmedia.com",
] as const;

/** These rules are basically to prevent useless redirects / redirect looping */
function createStaticRules(): Browser.declarativeNetRequest.UpdateRuleOptions[] {
	return [
		{
			addRules: [
				{
					action: { type: "allow" },
					condition: {
						requestDomains: [...WHITELISTED_REQUEST_DOMAINS],
						resourceTypes: ["image"],
					},
					id: DeclarativeNetRequestRuleIds.EXEMPT_WHITELISTED_DOMAINS_FROM_COMPRESSION,
					priority: DeclarativeNetRequestPriority.MID,
				},
			],
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.EXEMPT_WHITELISTED_DOMAINS_FROM_COMPRESSION,
			],
		},

		// To prevent looping when the default image that failed to be compressed is returned
		{
			addRules: [
				{
					action: { type: "allow" },
					condition: {
						regexFilter: REDIRECTED_FLAG,
						resourceTypes: ["image"],
					},
					id: DeclarativeNetRequestRuleIds.EXEMPT_FLAGGED_REQUESTS,
					priority: DeclarativeNetRequestPriority.MID,
				},
			],
			removeRuleIds: [DeclarativeNetRequestRuleIds.EXEMPT_FLAGGED_REQUESTS],
		},
	];
}

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
	enabled: boolean,
	config: typeof DEFAULT_COMPRESSION_SETTINGS,
): Browser.declarativeNetRequest.UpdateRuleOptions {
	const { format, preferredEndpoint, preserveAnim, quality, mode } = config;

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
									default: BASE_URL_WITH_FLAG,
									format,
									preserveAnim,
									quality,
									url: BASE_URL_WITHOUT_QUERY_STRING,
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
	config: Omit<typeof DEFAULT_COMPRESSION_SETTINGS, "mode">,
	urlOptions: ReadonlyArray<SiteCompressionOption>,
): Promise<Browser.declarativeNetRequest.UpdateRuleOptions> {
	const { format, preferredEndpoint, preserveAnim, quality } = config;

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
						default: BASE_URL_WITH_FLAG,
						format,
						preserveAnim,
						quality,
						url: BASE_URL_WITHOUT_QUERY_STRING,
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
	for (const rule of createStaticRules()) {
		declarativeNetRequestSafeUpdateDynamicRules(rule);
	}

	const [{ compression: globallyEnabled }, globalCompressionSettings] =
		await Promise.all([
			globalSettingsStorageItem.getValue(),
			compressionSettingsStorageItem.getValue(),
		]);

	const siteCompressionOptionPromises: Promise<SiteCompressionOption>[] = [];

	for (const url of await getSiteUrlOriginsFromStorage()) {
		siteCompressionOptionPromises.push(
			getSiteSpecificSettingsStorageItem(url)
				.getValue()
				.then(({ compression }) => ({
					enabled:
						compression && globalCompressionSettings.mode === SIMPLE_MODE,
					url,
				})),
		);
	}

	await Promise.all([
		declarativeNetRequestSafeUpdateDynamicRules(
			getGlobalCompressionRules(globallyEnabled, globalCompressionSettings),
		),
		declarativeNetRequestSafeUpdateDynamicRules(
			await getSiteCompressionRules(
				globalCompressionSettings,
				await Promise.all(siteCompressionOptionPromises),
			),
		),
	]);
}

export async function compressionModeSimpleToggleWatcher() {
	await toggleCompressionOnStartup();

	let globallyEnabled: boolean | undefined;
	let globalCompressionSettings:
		| typeof DEFAULT_COMPRESSION_SETTINGS
		| undefined;

	function updateGlobalCompressionRules(
		enabled: boolean | undefined,
		settings: typeof globalCompressionSettings,
	) {
		if (enabled != null && settings != null) {
			declarativeNetRequestSafeUpdateDynamicRules(
				getGlobalCompressionRules(enabled, settings),
			);
		}
	}

	globalSettingsStorageItem.watch(({ compression: compressionEnabled }) => {
		globallyEnabled = compressionEnabled;

		updateGlobalCompressionRules(globallyEnabled, globalCompressionSettings);
	});

	compressionSettingsStorageItem.watch((settings) => {
		globalCompressionSettings = settings;

		updateGlobalCompressionRules(globallyEnabled, globalCompressionSettings);
	});

	watchChangesToSiteSpecificSettings(async (changes) => {
		const options = changes.reduce<SiteCompressionOption[]>(
			(options, settingsChange) => {
				options.push({
					enabled: settingsChange.change.newValue?.compression ?? false,
					url: settingsChange.url,
				});

				return options;
			},
			[],
		);

		declarativeNetRequestSafeUpdateDynamicRules(
			await getSiteCompressionRules(
				await compressionSettingsStorageItem.getValue(),
				options,
			),
		);
	});
}
