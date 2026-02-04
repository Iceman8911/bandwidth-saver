import {
	IMAGE_COMPRESSION_URL_CONSTRUCTORS,
	ImageCompressorEndpoint,
	REDIRECTED_SEARCH_PARAM_FLAG,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import { browser } from "wxt/browser";
import {
	CompressionMode,
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import type {
	DefaultDnrRuleModifierPayload,
	SiteScopedDnrRuleModifierPayloadEntry,
} from "@/utils/dnr-rules";
import { getUrlSchemaHost } from "@/utils/url";

const { SIMPLE: SIMPLE_MODE } = CompressionMode;

/** The `bwsvr8911-img-compression-flag` is just a useless flage to make the regex unique
 *
 * Capture groups:
 * 1 -> protocol (https?://)
 * 2 -> host + path up to (but not including) query
 * 3 -> query string (including leading '?') if present
 */
const IMAGE_URL_REGEX = `^(https?://)(.+?)(\\?.*)?$`;

const PROTOCOL_OF_BASE_URL = "\\1" as UrlSchema;

const BASE_URL_WITHOUT_QUERY_STRING_OR_PROTOCOL = "\\2" as UrlSchema;

const BASE_URL_WITHOUT_QUERY_STRING =
	`${PROTOCOL_OF_BASE_URL}${BASE_URL_WITHOUT_QUERY_STRING_OR_PROTOCOL}` as UrlSchema;

/** The captured query string (including leading '?') — may be empty when the original URL had no query */
const CAPTURED_QUERY_STRING = "\\3" as UrlSchema;

/** When we add our redirected-search-param flag, it must come after any original query string */
const BASE_URL_WITH_FLAG =
	`${BASE_URL_WITHOUT_QUERY_STRING}${CAPTURED_QUERY_STRING}#${REDIRECTED_SEARCH_PARAM_FLAG}` as UrlSchema;

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
			// Wordpress endpoint expects the URL without protocol; preserve query string
			return `${BASE_URL_WITHOUT_QUERY_STRING_OR_PROTOCOL}${CAPTURED_QUERY_STRING}` as UrlSchema;
		default:
			// Preserve protocol + path + query string
			return `${BASE_URL_WITHOUT_QUERY_STRING}${CAPTURED_QUERY_STRING}` as UrlSchema;
	}
}

export async function applyDefaultSimpleCompressionRules({
	compression: { format, preferredEndpoint, preserveAnim, quality, mode },
	general: { compression, enabled },
	excludedDomains,
}: DefaultDnrRuleModifierPayload): Promise<void> {
	const isEnabled = enabled && compression && mode === SIMPLE_MODE;

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: isEnabled
			? [
					{
						action: {
							redirect: {
								regexSubstitution: (() => {
									const urlConstructor =
										IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];

									const fallbackEndpoint =
										getFallbackEndpoint(preferredEndpoint);
									const fallbackUrlConstructor =
										IMAGE_COMPRESSION_URL_CONSTRUCTORS[fallbackEndpoint];

									return urlConstructor({
										default_bwsvr8911: fallbackUrlConstructor({
											default_bwsvr8911: BASE_URL_WITH_FLAG,
											format_bwsvr8911: format,
											preserveAnim_bwsvr8911: preserveAnim,
											quality_bwsvr8911: quality,
											zz_url_bwsvr8911:
												getUrlToRedirectToForChosenEndpoint(fallbackEndpoint),
										}),
										format_bwsvr8911: format,
										preserveAnim_bwsvr8911: preserveAnim,
										quality_bwsvr8911: quality,
										zz_url_bwsvr8911:
											getUrlToRedirectToForChosenEndpoint(preferredEndpoint),
									});
								})(),
							},
							type: "redirect",
						},
						condition: (() => {
							const preferredEndpointDomain =
								getUrlSchemaHost(preferredEndpoint);

							return {
								excludedInitiatorDomains: excludedDomains.concat(
									preferredEndpointDomain,
								),
								excludedRequestDomains: [preferredEndpointDomain],
								regexFilter: IMAGE_URL_REGEX,
								resourceTypes: ["image"],
							};
						})(),
						id: DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [
			DeclarativeNetRequestRuleIds.GLOBAL_COMPRESSION_MODE_SIMPLE,
		],
	});
}

export async function applySiteScopedSimpleCompressionRules([
	host,
	{
		compression: { format, preferredEndpoint, preserveAnim, quality, mode },
		general: { compression, enabled, useSiteRule },
		ids: {
			compression: { simple: simpleCompressionId },
		},
	},
]: SiteScopedDnrRuleModifierPayloadEntry): Promise<void> {
	const isEnabled =
		enabled && compression && useSiteRule && mode === SIMPLE_MODE;

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: isEnabled
			? [
					{
						action: {
							redirect: {
								regexSubstitution: (() => {
									const urlConstructor =
										IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];

									const fallbackEndpoint =
										getFallbackEndpoint(preferredEndpoint);
									const fallbackUrlConstructor =
										IMAGE_COMPRESSION_URL_CONSTRUCTORS[fallbackEndpoint];

									return urlConstructor({
										default_bwsvr8911: fallbackUrlConstructor({
											default_bwsvr8911: BASE_URL_WITH_FLAG,
											format_bwsvr8911: format,
											preserveAnim_bwsvr8911: preserveAnim,
											quality_bwsvr8911: quality,
											zz_url_bwsvr8911:
												getUrlToRedirectToForChosenEndpoint(fallbackEndpoint),
										}),
										format_bwsvr8911: format,
										preserveAnim_bwsvr8911: preserveAnim,
										quality_bwsvr8911: quality,
										zz_url_bwsvr8911:
											getUrlToRedirectToForChosenEndpoint(preferredEndpoint),
									});
								})(),
							},
							type: "redirect",
						},
						condition: (() => {
							const preferredEndpointDomain =
								getUrlSchemaHost(preferredEndpoint);

							return {
								excludedRequestDomains: [preferredEndpointDomain],
								initiatorDomains: [host],
								regexFilter: IMAGE_URL_REGEX,
								resourceTypes: ["image"],
							};
						})(),
						id: simpleCompressionId,
						priority: DeclarativeNetRequestPriority.LOWEST,
					},
				]
			: undefined,
		removeRuleIds: [simpleCompressionId],
	});
}
