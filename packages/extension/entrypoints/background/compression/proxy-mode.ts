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
import { DECLARATIVE_NET_REQUEST_COMPRESSION_REGEX_FLAG } from "./shared";

const { PROXY: PROXY_MODE } = CompressionMode;

const IMAGE_URL_REGEX = `^(?:${DECLARATIVE_NET_REQUEST_COMPRESSION_REGEX_FLAG})?(https?://.+)`;

export async function getDefaultProxyCompressionRules(): Promise<Browser.declarativeNetRequest.UpdateRuleOptions> {
	const [
		{ format, preserveAnim, quality, mode },
		proxySettings,
		{ compression, enabled },
	] = await Promise.all([
		defaultCompressionSettingsStorageItem.getValue(),
		defaultProxySettingsStorageItem.getValue(),
		defaultGeneralSettingsStorageItem.getValue(),
	]);

	const isEnabled = compression && mode === PROXY_MODE && enabled;

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
		{ ruleIdOffset, compression, enabled },
		{ format, preserveAnim, quality, mode },
		proxySettings,
	] = await Promise.all([
		getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
		getSiteSpecificCompressionSettingsStorageItem(url).getValue(),
		getSiteSpecificProxySettingsStorageItem(url).getValue(),
	]);

	const isEnabled =
		compression && ruleIdOffset != null && mode === PROXY_MODE && enabled;

	const ruleIdWithOffset =
		DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_PROXY +
		(ruleIdOffset ?? 0);

	const initiatorDomain = new URL(url).host;

	if (!isEnabled) {
		// Search for the old rule since it only has a single intiator domain, and the appropriate unique image regex
		const possibleRuleToRemove = (
			await browser.declarativeNetRequest.getSessionRules()
		).find(
			({ condition: { regexFilter, initiatorDomains } }) =>
				regexFilter === IMAGE_URL_REGEX &&
				initiatorDomains?.[0] === initiatorDomain,
		);

		return {
			removeRuleIds: possibleRuleToRemove
				? [possibleRuleToRemove.id]
				: undefined,
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
					initiatorDomains: [initiatorDomain],
					regexFilter: IMAGE_URL_REGEX,
					resourceTypes: ["image"],
				},
				id: ruleIdWithOffset,
				priority: DeclarativeNetRequestPriority.LOWEST,
			},
		],
		removeRuleIds: [ruleIdWithOffset],
	};
}
