import {
	customProxyUrlConstructor,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import {
	CompressionMode,
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import {
	defaultCompressionSettingsStorageItem,
	defaultGeneralSettingsStorageItem,
	defaultProxySettingsStorageItem,
	getSiteSpecificCompressionSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
	getSiteSpecificProxySettingsStorageItem,
} from "@/shared/storage";

const { PROXY: PROXY_MODE } = CompressionMode;

const IMAGE_URL_REGEX = "(https?://.+)";

export async function getDefaultProxyCompressionRules(): Promise<Browser.declarativeNetRequest.UpdateRuleOptions> {
	const [
		{ format, preserveAnim, quality, mode },
		proxySettings,
		{ compression },
	] = await Promise.all([
		defaultCompressionSettingsStorageItem.getValue(),
		defaultProxySettingsStorageItem.getValue(),
		defaultGeneralSettingsStorageItem.getValue(),
	]);

	const isEnabled = compression && mode === PROXY_MODE;

	if (!isEnabled) {
		return {
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PROXY,
			],
		};
	}

	const proxyUrl = customProxyUrlConstructor(
		{
			format_bwsvr8911: format,
			preserveAnim_bwsvr8911: preserveAnim,
			quality_bwsvr8911: quality,
			url_bwsvr8911: "\\0" as UrlSchema,
		},
		proxySettings,
	);

	const proxyDomain = proxySettings.host.replace(/^https?:\/\//, "");

	// Get domains that have custom settings (useDefaultRules=false)
	const excludedDomains = [...(await getSiteDomainsToNotApplyDefaultRule())];

	return {
		addRules: [
			{
				action: {
					redirect: {
						regexSubstitution: proxyUrl,
					},
					type: "redirect",
				},
				condition: {
					excludedInitiatorDomains: [
						proxyDomain,
						...(excludedDomains.length ? excludedDomains : []),
					],
					excludedRequestDomains: [proxyDomain],
					regexFilter: IMAGE_URL_REGEX,
					resourceTypes: ["image"],
				},
				id: DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PROXY,
				priority: DeclarativeNetRequestPriority.LOWEST,
			},
		],
		removeRuleIds: [DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_PROXY],
	};
}

export async function getSiteProxyCompressionRules(
	url: UrlSchema,
): Promise<Browser.declarativeNetRequest.UpdateRuleOptions> {
	const [
		{ ruleIdOffset, compression },
		{ format, preserveAnim, quality, mode },
		proxySettings,
	] = await Promise.all([
		getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
		getSiteSpecificCompressionSettingsStorageItem(url).getValue(),
		getSiteSpecificProxySettingsStorageItem(url).getValue(),
	]);

	const isEnabled = compression && ruleIdOffset != null && mode === PROXY_MODE;

	if (!isEnabled)
		return {
			removeRuleIds: [DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY],
		};

	const proxyUrl = customProxyUrlConstructor(
		{
			format_bwsvr8911: format,
			preserveAnim_bwsvr8911: preserveAnim,
			quality_bwsvr8911: quality,
			url_bwsvr8911: "\\0" as UrlSchema,
		},
		proxySettings,
	);

	const proxyDomain = proxySettings.host.replace(/^https?:\/\//, "");

	return {
		addRules: [
			{
				action: {
					redirect: {
						regexSubstitution: proxyUrl,
					},
					type: "redirect",
				},
				condition: {
					excludedRequestDomains: [proxyDomain],
					initiatorDomains: [new URL(url).host],
					regexFilter: IMAGE_URL_REGEX,
					resourceTypes: ["image"],
				},
				id: DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY,
				priority: DeclarativeNetRequestPriority.LOWEST,
			},
		],
		removeRuleIds: [DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY],
	};
}
