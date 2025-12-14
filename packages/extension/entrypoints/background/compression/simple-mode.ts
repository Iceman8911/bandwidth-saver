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
import { getSiteDomainsToNotApplyDefaultRule } from "@/utils/storage";

const getFallbackUrlConstructor = (
	preferredEndpoint: ImageCompressorEndpoint,
) =>
	IMAGE_COMPRESSION_URL_CONSTRUCTORS[
		preferredEndpoint === ImageCompressorEndpoint.DEFAULT
			? ImageCompressorEndpoint.FLY_IMG_IO
			: ImageCompressorEndpoint.DEFAULT
	];

const { SIMPLE: SIMPLE_MODE } = CompressionMode;

const IMAGE_URL_REGEX = "(https?://.+?)(?:\\?.*)?$";

const BASE_URL_WITHOUT_QUERY_STRING = "\\1" as UrlSchema;

const BASE_URL_WITH_FLAG = `\\1#${REDIRECTED_SEARCH_PARAM_FLAG}` as UrlSchema;

export async function getDefaultSimpleCompressionRules(): Promise<Browser.declarativeNetRequest.UpdateRuleOptions> {
	const [
		{ format, preferredEndpoint, preserveAnim, quality, mode },
		{ compression },
	] = await Promise.all([
		defaultCompressionSettingsStorageItem.getValue(),
		defaultGeneralSettingsStorageItem.getValue(),
	]);

	const isEnabled = compression && mode === SIMPLE_MODE;

	if (!isEnabled) {
		return {
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
			],
		};
	}

	const excludedDomains = [...(await getSiteDomainsToNotApplyDefaultRule())];

	const urlConstructor = IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];
	const fallbackUrlConstructor = getFallbackUrlConstructor(preferredEndpoint);

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
								url_bwsvr8911: BASE_URL_WITHOUT_QUERY_STRING,
							}),
							format_bwsvr8911: format,
							preserveAnim_bwsvr8911: preserveAnim,
							quality_bwsvr8911: quality,
							url_bwsvr8911: BASE_URL_WITHOUT_QUERY_STRING,
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
		{ useDefaultRules, compression },
		{ format, preserveAnim, quality, mode, preferredEndpoint },
	] = await Promise.all([
		getSiteSpecificGeneralSettingsStorageItem(url).getValue(),
		getSiteSpecificCompressionSettingsStorageItem(url).getValue(),
	]);

	const isEnabled = compression && mode === SIMPLE_MODE && !useDefaultRules;

	if (!isEnabled)
		return {
			removeRuleIds: [
				DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE,
			],
		};

	const preferredEndpointDomain = preferredEndpoint.replace(/^https?:\/\//, "");

	const urlConstructor = IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];
	const fallbackUrlConstructor = getFallbackUrlConstructor(preferredEndpoint);

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
								url_bwsvr8911: BASE_URL_WITHOUT_QUERY_STRING,
							}),
							format_bwsvr8911: format,
							preserveAnim_bwsvr8911: preserveAnim,
							quality_bwsvr8911: quality,
							url_bwsvr8911: BASE_URL_WITHOUT_QUERY_STRING,
						}),
					},
					type: "redirect",
				},
				condition: {
					excludedRequestDomains: [preferredEndpointDomain],
					regexFilter: IMAGE_URL_REGEX,
					resourceTypes: ["image"],
				},
				id: DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE,
				priority: DeclarativeNetRequestPriority.LOWEST,
			},
		],
		removeRuleIds: [DeclarativeNetRequestRuleIds.SITE_COMPRESSION_MODE_SIMPLE],
	};
}
