import {
	customProxyUrlConstructor,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import type {
	DEFAULT_COMPRESSION_SETTINGS,
	DEFAULT_PROXY_SETTINGS,
} from "@/models/storage";
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
	proxySettingsStorageItem,
} from "@/shared/storage";
import { getEnabledAndDisabledDomainsFromNewAndOldSiteOptions } from "../utils";

const { PROXY: PROXY_MODE } = CompressionMode;

const IMAGE_URL_REGEX = ".*";

type SiteCompressionOption = { url: UrlSchema; enabled: boolean };

function getGlobalProxyRules(
	enabled: boolean,
	config: typeof DEFAULT_COMPRESSION_SETTINGS,
	proxy: typeof DEFAULT_PROXY_SETTINGS,
): Browser.declarativeNetRequest.UpdateRuleOptions {
	const { format, preserveAnim, quality, mode } = config;

	if (mode !== PROXY_MODE)
		return {
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PROXY,
			],
		};

	const proxyUrl = customProxyUrlConstructor(
		{
			format_bwsvr8911: format,
			preserveAnim_bwsvr8911: preserveAnim,
			quality_bwsvr8911: quality,
			url_bwsvr8911: "\\0" as UrlSchema,
		},
		proxy,
	);

	const proxyDomain = proxy.host.replace(/^https?:\/\//, "");

	return {
		addRules: enabled
			? [
					{
						action: {
							redirect: {
								regexSubstitution: proxyUrl,
							},
							type: "redirect",
						},
						condition: {
							excludedInitiatorDomains: [proxyDomain],
							excludedRequestDomains: [proxyDomain],
							regexFilter: IMAGE_URL_REGEX,
							resourceTypes: ["image"],
						},
						id: DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PATCH,
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

async function getSiteProxyRules(
	config: Omit<typeof DEFAULT_COMPRESSION_SETTINGS, "mode">,
	urlOptions: ReadonlyArray<SiteCompressionOption>,
	proxy: typeof DEFAULT_PROXY_SETTINGS,
): Promise<Browser.declarativeNetRequest.UpdateRuleOptions> {
	const { format, preserveAnim, quality } = config;

	const proxyUrl = customProxyUrlConstructor(
		{
			format_bwsvr8911: format,
			preserveAnim_bwsvr8911: preserveAnim,
			quality_bwsvr8911: quality,
			url_bwsvr8911: "\\0" as UrlSchema,
		},
		proxy,
	);

	const proxyDomain = proxy.host.replace(/^https?:\/\//, "");

	const { enabledDomains, disabledDomains } =
		await getEnabledAndDisabledDomainsFromNewAndOldSiteOptions(
			urlOptions,
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY_ADD,
			DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY_REMOVE,
		);

	const rulesToAdd: Browser.declarativeNetRequest.Rule[] = [];

	if (enabledDomains.length) {
		rulesToAdd.push({
			action: {
				redirect: {
					regexSubstitution: proxyUrl,
				},
				type: "redirect",
			},
			condition: {
				excludedRequestDomains: [proxyDomain],
				initiatorDomains: enabledDomains,
				regexFilter: IMAGE_URL_REGEX,
				resourceTypes: ["image"],
			},
			id: DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY_ADD,
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
			id: DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY_REMOVE,
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

async function toggleProxyCompressionOnStartup() {
	const [{ compression }, globalCompressionSettings, proxySettings] =
		await Promise.all([
			globalSettingsStorageItem.getValue(),
			compressionSettingsStorageItem.getValue(),
			proxySettingsStorageItem.getValue(),
		]);

	const siteCompressionOptionPromises: Promise<SiteCompressionOption>[] = [];

	for (const url of await getSiteUrlOriginsFromStorage()) {
		siteCompressionOptionPromises.push(
			getSiteSpecificSettingsStorageItem(url)
				.getValue()
				.then(({ compression }) => ({
					enabled: compression && globalCompressionSettings.mode === PROXY_MODE,
					url,
				})),
		);
	}

	await Promise.all([
		declarativeNetRequestSafeUpdateDynamicRules(
			getGlobalProxyRules(
				compression,
				globalCompressionSettings,
				proxySettings,
			),
		),
		declarativeNetRequestSafeUpdateDynamicRules(
			await getSiteProxyRules(
				globalCompressionSettings,
				await Promise.all(siteCompressionOptionPromises),
				proxySettings,
			),
		),
	]);
}

export async function compressionModeProxyToggleWatcher() {
	await toggleProxyCompressionOnStartup();

	let globallyEnabled: boolean | undefined;
	let globalCompressionSettings:
		| typeof DEFAULT_COMPRESSION_SETTINGS
		| undefined;
	let globalProxySettings: typeof DEFAULT_PROXY_SETTINGS | undefined;

	function updateGlobalCompressionRules(
		enabled: boolean | undefined,
		settings: typeof globalCompressionSettings,
		proxy: typeof globalProxySettings,
	) {
		if (enabled != null && settings && proxy) {
			declarativeNetRequestSafeUpdateDynamicRules(
				getGlobalProxyRules(enabled, settings, proxy),
			);
		}
	}

	globalSettingsStorageItem.watch(({ compression }) => {
		globallyEnabled = compression;

		updateGlobalCompressionRules(
			globallyEnabled,
			globalCompressionSettings,
			globalProxySettings,
		);
	});

	compressionSettingsStorageItem.watch((settings) => {
		globalCompressionSettings = settings;

		updateGlobalCompressionRules(
			globallyEnabled,
			globalCompressionSettings,
			globalProxySettings,
		);
	});

	proxySettingsStorageItem.watch((settings) => {
		globalProxySettings = settings;

		updateGlobalCompressionRules(
			globallyEnabled,
			globalCompressionSettings,
			globalProxySettings,
		);
	});

	watchChangesToSiteSpecificSettings(async (changes) => {
		const options = changes.reduce<SiteCompressionOption[]>(
			(options, { change: { newValue }, url }) => {
				options.push({
					enabled: newValue?.compression ?? false,
					url: url,
				});

				return options;
			},
			[],
		);

		const [compressionSettings, proxySettings] = await Promise.all([
			compressionSettingsStorageItem.getValue(),
			proxySettingsStorageItem.getValue(),
		]);

		declarativeNetRequestSafeUpdateDynamicRules(
			await getSiteProxyRules(compressionSettings, options, proxySettings),
		);
	});
}
