import {
	IMAGE_COMPRESSION_URL_CONSTRUCTORS,
	ImageCompressorEndpoint,
	REDIRECTED_SEARCH_PARAM_FLAG,
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
	getSiteSpecificCompressionSettingsStorageItem,
	getSiteSpecificGeneralSettingsStorageItem,
} from "@/shared/storage";

const { SIMPLE: SIMPLE_MODE } = CompressionMode;

const IMAGE_URL_REGEX = "(https?://)(.+?)(?:\\?.*)?$";

const PROTOCOL_OF_BASE_URL = "\\1" as UrlSchema;

const BASE_URL_WITHOUT_QUERY_STRING_OR_PROTOCOL = "\\2" as UrlSchema;

const BASE_URL_WITHOUT_QUERY_STRING =
	`${PROTOCOL_OF_BASE_URL}${BASE_URL_WITHOUT_QUERY_STRING_OR_PROTOCOL}` as UrlSchema;

const BASE_URL_WITH_FLAG =
	`${BASE_URL_WITHOUT_QUERY_STRING}#${REDIRECTED_SEARCH_PARAM_FLAG}` as UrlSchema;

function getFallbackEndpoint(preferredEndpoint: ImageCompressorEndpoint) {
	return preferredEndpoint === ImageCompressorEndpoint.DEFAULT
		? ImageCompressorEndpoint.BACKUP
		: ImageCompressorEndpoint.DEFAULT;
}

function getUrlToRedirectToForChosenEndpoint(
	endpoint: ImageCompressorEndpoint,
) {
	switch (endpoint) {
		case ImageCompressorEndpoint.WORDPRESS:
			return BASE_URL_WITHOUT_QUERY_STRING_OR_PROTOCOL;
		default:
			return BASE_URL_WITHOUT_QUERY_STRING;
	}
}

export async function getDefaultSimpleCompressionRules(): Promise<Browser.declarativeNetRequest.UpdateRuleOptions> {
	const [
		{ format, preferredEndpoint, preserveAnim, quality, mode },
		{ compression, enabled },
	] = await Promise.all([
		defaultCompressionSettingsStorageItem.getValue(),
		defaultGeneralSettingsStorageItem.getValue(),
	]);

	const isEnabled = compression && mode === SIMPLE_MODE && enabled;

	if (!isEnabled) {
		return {
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
			],
		};
	}

	const excludedDomains = [...(await getSiteDomainsToNotApplyDefaultRule())];

	const urlConstructor = IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];
	const fallbackEndpoint = getFallbackEndpoint(preferredEndpoint);
	const fallbackUrlConstructor =
		IMAGE_COMPRESSION_URL_CONSTRUCTORS[fallbackEndpoint];

	const preferredEndpointDomain = preferredEndpoint.replace(/^https?:\/\//, "");

	return {
		addRules: [
			{
				action: {
					redirect: {
						regexSubstitution: urlConstructor({
							default_bwsvr8911: fallbackUrlConstructor({
								default_bwsvr8911: BASE_URL_WITH_FLAG,
								format_bwsvr8911: format,
								preserveAnim_bwsvr8911: preserveAnim,
								quality_bwsvr8911: quality,
								url_bwsvr8911:
									getUrlToRedirectToForChosenEndpoint(fallbackEndpoint),
							}),
							format_bwsvr8911: format,
							preserveAnim_bwsvr8911: preserveAnim,
							quality_bwsvr8911: quality,
							url_bwsvr8911:
								getUrlToRedirectToForChosenEndpoint(preferredEndpoint),
						}),
					},
					type: "redirect",
				},
				condition: {
					excludedInitiatorDomains: excludedDomains.length
						? [...excludedDomains, preferredEndpointDomain]
						: [preferredEndpointDomain],
					excludedRequestDomains: [preferredEndpointDomain],
					regexFilter: IMAGE_URL_REGEX,
					resourceTypes: ["image"],
				},
				id: DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
				priority: DeclarativeNetRequestPriority.LOWEST,
			},
		],
		removeRuleIds: [
			DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
		],
	};
}

export async function getSiteSimpleCompressionRules(
	url: UrlSchema,
): Promise<Browser.declarativeNetRequest.UpdateRuleOptions> {
	const [
		{ ruleIdOffset, compression, enabled },
		{ format, preserveAnim, quality, mode, preferredEndpoint },
	] = await Promise.all([
		getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
		getSiteSpecificCompressionSettingsStorageItem(url).getValue(),
	]);

	const isEnabled =
		compression && mode === SIMPLE_MODE && ruleIdOffset != null && enabled;

	const ruleIdWithOffset =
		DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE +
		(ruleIdOffset ?? 0);

	if (!isEnabled)
		return {
			removeRuleIds: [ruleIdWithOffset],
		};

	const preferredEndpointDomain = preferredEndpoint.replace(/^https?:\/\//, "");

	const urlConstructor = IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];
	const fallbackEndpoint = getFallbackEndpoint(preferredEndpoint);
	const fallbackUrlConstructor =
		IMAGE_COMPRESSION_URL_CONSTRUCTORS[fallbackEndpoint];

	return {
		addRules: [
			{
				action: {
					redirect: {
						regexSubstitution: urlConstructor({
							default_bwsvr8911: fallbackUrlConstructor({
								default_bwsvr8911: BASE_URL_WITH_FLAG,
								format_bwsvr8911: format,
								preserveAnim_bwsvr8911: preserveAnim,
								quality_bwsvr8911: quality,
								url_bwsvr8911:
									getUrlToRedirectToForChosenEndpoint(fallbackEndpoint),
							}),
							format_bwsvr8911: format,
							preserveAnim_bwsvr8911: preserveAnim,
							quality_bwsvr8911: quality,
							url_bwsvr8911:
								getUrlToRedirectToForChosenEndpoint(preferredEndpoint),
						}),
					},
					type: "redirect",
				},
				condition: {
					excludedRequestDomains: [preferredEndpointDomain],
					initiatorDomains: [new URL(url).host],
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
