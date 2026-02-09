import {
	IMAGE_COMPRESSION_URL_CONSTRUCTORS,
	ImageCompressorEndpoint,
	REDIRECTED_SEARCH_PARAM_FLAG,
	ServerAPIEndpoint,
	type UrlSchema,
} from "@bandwidth-saver/shared";
import { type Browser, browser } from "wxt/browser";
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
import { proxyUrlConstructor } from "./shared";

const { PROXY: PROXY_MODE, SIMPLE: SIMPLE_MODE } = CompressionMode;

/**
 * SIMPLE MODE REGEX:
 *
 * Capture groups:
 * 1 -> protocol (https?://)
 * 2 -> host + path up to (but not including) query
 * 3 -> query string (including leading '?') if present
 */
const SIMPLE_IMAGE_URL_REGEX = `^(https?://)(.+?)(\\?.*)?$`;

/**
 * PROXY MODE REGEX:
 *
 * Capture group:
 * 1 -> full https? url
 */
const PROXY_IMAGE_URL_REGEX = `^(https?://.+)`;

const PROTOCOL_OF_BASE_URL = "\\1" as UrlSchema;

const BASE_URL_WITHOUT_QUERY_STRING_OR_PROTOCOL = "\\2" as UrlSchema;

const BASE_URL_WITHOUT_QUERY_STRING =
	`${PROTOCOL_OF_BASE_URL}${BASE_URL_WITHOUT_QUERY_STRING_OR_PROTOCOL}` as UrlSchema;

/** The captured query string (including leading '?') — may be empty when the original URL had no query */
const CAPTURED_QUERY_STRING = "\\3" as UrlSchema;

/** When we add our redirect-exemption flag, it must come after any original query string */
const BASE_URL_WITH_FLAG =
	`${BASE_URL_WITHOUT_QUERY_STRING}${CAPTURED_QUERY_STRING}${REDIRECTED_SEARCH_PARAM_FLAG}` as UrlSchema;

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

type DefaultCompressionRulePayload = Readonly<{
	compression: DefaultDnrRuleModifierPayload["compression"];
	general: Pick<
		DefaultDnrRuleModifierPayload["general"],
		"enabled" | "compression"
	>;
	proxy: DefaultDnrRuleModifierPayload["proxy"];
	excludedDomains: DefaultDnrRuleModifierPayload["excludedDomains"];
}>;

type SiteScopedCompressionRulePayload = Readonly<{
	host: string;
	compression: SiteScopedDnrRuleModifierPayloadEntry[1]["compression"];
	general: Pick<
		SiteScopedDnrRuleModifierPayloadEntry[1]["general"],
		"enabled" | "compression" | "useSiteRule"
	>;
	proxy: SiteScopedDnrRuleModifierPayloadEntry[1]["proxy"];
	ids: Pick<SiteScopedDnrRuleModifierPayloadEntry[1]["ids"], "compression">;
}>;

function buildDefaultCompressionRule({
	compression: { format, preferredEndpoint, preserveAnim, mode, quality },
	general: { compression, enabled },
	proxy: proxySettings,
	excludedDomains,
}: DefaultCompressionRulePayload): Browser.declarativeNetRequest.Rule | null {
	const isCompressionEnabled = enabled && compression;

	if (!isCompressionEnabled) return null;

	switch (mode) {
		case SIMPLE_MODE: {
			const preferredEndpointDomain = getUrlSchemaHost(preferredEndpoint);

			const urlConstructor =
				IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];

			const fallbackEndpoint = getFallbackEndpoint(preferredEndpoint);
			const fallbackUrlConstructor =
				IMAGE_COMPRESSION_URL_CONSTRUCTORS[fallbackEndpoint];

			const url = urlConstructor({
				cloudinary_bwsvr8911: proxySettings.cloudinary,
				default_bwsvr8911: fallbackUrlConstructor({
					cloudinary_bwsvr8911: proxySettings.cloudinary,
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

			return {
				action: {
					redirect: {
						regexSubstitution: url,
					},
					type: "redirect",
				},
				condition: {
					excludedInitiatorDomains: excludedDomains.concat(
						preferredEndpointDomain,
					),
					excludedRequestDomains: [preferredEndpointDomain],
					regexFilter: SIMPLE_IMAGE_URL_REGEX,
					resourceTypes: ["image"],
				},
				id: DeclarativeNetRequestRuleIds.DEFAULT_COMPRESSION_MODE,
				priority: DeclarativeNetRequestPriority.LOWEST,
			};
		}

		case PROXY_MODE: {
			const proxyUrl = proxyUrlConstructor({
				endpoint: ServerAPIEndpoint.PROCESS_IMAGE,
				payload: {
					cloudinary_bwsvr8911: proxySettings.cloudinary,
					format_bwsvr8911: format,
					preserveAnim_bwsvr8911: preserveAnim,
					quality_bwsvr8911: quality,
					zz_url_bwsvr8911: "\\0" as UrlSchema,
				},
				proxy: proxySettings,
			});

			const proxyDomain = getUrlSchemaHost(proxySettings.host);

			return {
				action: {
					redirect: {
						regexSubstitution: proxyUrl,
					},
					type: "redirect",
				},
				condition: {
					excludedInitiatorDomains: excludedDomains.concat(proxyDomain),
					excludedRequestDomains: [proxyDomain],
					regexFilter: PROXY_IMAGE_URL_REGEX,
					resourceTypes: ["image"],
				},
				id: DeclarativeNetRequestRuleIds.DEFAULT_COMPRESSION_MODE,
				// High so it can override some static/session exemptions when desired
				priority: DeclarativeNetRequestPriority.HIGH,
			};
		}

		default:
			return null;
	}
}

function buildSiteScopedCompressionRule({
	host,
	compression: { format, preferredEndpoint, preserveAnim, mode, quality },
	general: { compression, enabled, useSiteRule },
	proxy: proxySettings,
	ids: { compression: compressionId },
}: SiteScopedCompressionRulePayload): Browser.declarativeNetRequest.Rule | null {
	const isCompressionEnabled = enabled && compression && useSiteRule;

	if (!isCompressionEnabled) return null;

	switch (mode) {
		case SIMPLE_MODE: {
			const preferredEndpointDomain = getUrlSchemaHost(preferredEndpoint);
			const urlConstructor =
				IMAGE_COMPRESSION_URL_CONSTRUCTORS[preferredEndpoint];

			const fallbackEndpoint = getFallbackEndpoint(preferredEndpoint);
			const fallbackUrlConstructor =
				IMAGE_COMPRESSION_URL_CONSTRUCTORS[fallbackEndpoint];

			const url = urlConstructor({
				cloudinary_bwsvr8911: proxySettings.cloudinary,
				default_bwsvr8911: fallbackUrlConstructor({
					cloudinary_bwsvr8911: proxySettings.cloudinary,
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

			return {
				action: {
					redirect: {
						regexSubstitution: url,
					},
					type: "redirect",
				},
				condition: {
					excludedRequestDomains: [preferredEndpointDomain],
					initiatorDomains: [host],
					regexFilter: SIMPLE_IMAGE_URL_REGEX,
					resourceTypes: ["image"],
				},
				id: compressionId,
				priority: DeclarativeNetRequestPriority.LOWEST,
			};
		}

		case PROXY_MODE: {
			const proxyUrl = proxyUrlConstructor({
				endpoint: ServerAPIEndpoint.PROCESS_IMAGE,
				payload: {
					cloudinary_bwsvr8911: proxySettings.cloudinary,
					format_bwsvr8911: format,
					preserveAnim_bwsvr8911: preserveAnim,
					quality_bwsvr8911: quality,
					zz_url_bwsvr8911: "\\0" as UrlSchema,
				},
				proxy: proxySettings,
			});

			const proxyDomain = getUrlSchemaHost(proxySettings.host);

			return {
				action: {
					redirect: {
						regexSubstitution: proxyUrl,
					},
					type: "redirect",
				},
				condition: {
					excludedRequestDomains: [proxyDomain],
					initiatorDomains: [host],
					regexFilter: PROXY_IMAGE_URL_REGEX,
					resourceTypes: ["image"],
				},
				id: compressionId,
				// High so it can override some static/session exemptions when desired
				priority: DeclarativeNetRequestPriority.HIGH,
			};
		}

		default:
			return null;
	}
}

export async function applyDefaultCompressionRules(
	payload: DefaultDnrRuleModifierPayload,
): Promise<void> {
	const rule = buildDefaultCompressionRule({
		compression: payload.compression,
		excludedDomains: payload.excludedDomains,
		general: payload.general,
		proxy: payload.proxy,
	});

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: rule ? [rule] : undefined,
		removeRuleIds: [DeclarativeNetRequestRuleIds.DEFAULT_COMPRESSION_MODE],
	});
}

export async function applySiteScopedCompressionRules([
	host,
	{ compression, general, ids, proxy },
]: SiteScopedDnrRuleModifierPayloadEntry): Promise<void> {
	const rule = buildSiteScopedCompressionRule({
		compression,
		general,
		host,
		ids,
		proxy,
	});

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: rule ? [rule] : undefined,
		removeRuleIds: [ids.compression],
	});
}
