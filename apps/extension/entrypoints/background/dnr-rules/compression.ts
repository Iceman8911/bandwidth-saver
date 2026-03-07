import {
	IMAGE_COMPRESSION_URL_CONSTRUCTORS,
	ImageCompressorEndpoint,
	ProxyCustomHeaders,
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
import type { BrowserMajorVersion } from "@/utils/browser-info";
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

/** https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/HeaderInfo */
function doesBrowserSupportResponseHeadersCondition(
	browserMajor: BrowserMajorVersion,
): boolean {
	return browserMajor.chrome >= 128;
}

function enhanceRuleConditionWithResponseHeadersCondition(
	browserMajor: BrowserMajorVersion,
	condition: Browser.declarativeNetRequest.RuleCondition,
): Browser.declarativeNetRequest.RuleCondition {
	if (doesBrowserSupportResponseHeadersCondition(browserMajor)) {
		condition.resourceTypes?.push("xmlhttprequest");
		condition.responseHeaders = [
			{ header: "content-type", values: ["image/*"] },
		];
	}

	return condition;
}

async function getCookieStringForSiteDomain(
	domain: string,
): Promise<string | null> {
	if (!browser.cookies) return null;

	const cookies = await browser.cookies.getAll({ domain });

	if (!cookies.length) return null;

	return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

type DefaultCompressionRulePayload = Readonly<{
	browserMajor: DefaultDnrRuleModifierPayload["browserMajor"];
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
	browserMajor: SiteScopedDnrRuleModifierPayloadEntry[1]["browserMajor"];
	compression: SiteScopedDnrRuleModifierPayloadEntry[1]["compression"];
	general: Pick<
		SiteScopedDnrRuleModifierPayloadEntry[1]["general"],
		"enabled" | "compression" | "useSiteRule"
	>;
	proxy: SiteScopedDnrRuleModifierPayloadEntry[1]["proxy"];
	ids: SiteScopedDnrRuleModifierPayloadEntry[1]["ids"];
}>;

function buildDefaultCompressionRule({
	browserMajor,
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

			let condition: Browser.declarativeNetRequest.RuleCondition = {
				excludedInitiatorDomains: excludedDomains.concat(
					preferredEndpointDomain,
				),
				excludedRequestDomains: [preferredEndpointDomain],
				regexFilter: SIMPLE_IMAGE_URL_REGEX,
				resourceTypes: ["image"],
			};

			condition = enhanceRuleConditionWithResponseHeadersCondition(
				browserMajor,
				condition,
			);

			return {
				action: {
					redirect: {
						regexSubstitution: url,
					},
					type: "redirect",
				},
				condition,
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

			let condition: Browser.declarativeNetRequest.RuleCondition = {
				excludedInitiatorDomains: excludedDomains.concat(proxyDomain),
				excludedRequestDomains: [proxyDomain],
				regexFilter: PROXY_IMAGE_URL_REGEX,
				resourceTypes: ["image"],
			};

			condition = enhanceRuleConditionWithResponseHeadersCondition(
				browserMajor,
				condition,
			);

			return {
				action: {
					redirect: {
						regexSubstitution: proxyUrl,
					},
					type: "redirect",
				},
				condition,
				id: DeclarativeNetRequestRuleIds.DEFAULT_COMPRESSION_MODE,
				// High so it can override some static/session exemptions when desired
				priority: DeclarativeNetRequestPriority.HIGH,
			};
		}

		default:
			return null;
	}
}

async function buildSiteScopedCompressionRule({
	host,
	browserMajor,
	compression: { format, preferredEndpoint, preserveAnim, mode, quality },
	general: { compression, enabled, useSiteRule },
	proxy: proxySettings,
	ids: { compression: compressionId, cookieSync: cookiesSyncId },
}: SiteScopedCompressionRulePayload): Promise<
	Browser.declarativeNetRequest.Rule[]
> {
	const isCompressionEnabled = enabled && compression && useSiteRule;

	if (!isCompressionEnabled) return [];

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

			let condition: Browser.declarativeNetRequest.RuleCondition = {
				excludedRequestDomains: [preferredEndpointDomain],
				initiatorDomains: [host],
				regexFilter: SIMPLE_IMAGE_URL_REGEX,
				resourceTypes: ["image"],
			};

			condition = enhanceRuleConditionWithResponseHeadersCondition(
				browserMajor,
				condition,
			);

			return [
				{
					action: {
						redirect: {
							regexSubstitution: url,
						},
						type: "redirect",
					},
					condition,
					id: compressionId,
					priority: DeclarativeNetRequestPriority.LOWEST,
				},
			];
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

			const proxyUrlPrefix = proxyUrl.split("zz_url_bwsvr8911=")[0];

			let compressionRuleCondition: Browser.declarativeNetRequest.RuleCondition =
				{
					excludedRequestDomains: [proxyDomain],
					initiatorDomains: [host],
					regexFilter: PROXY_IMAGE_URL_REGEX,
					resourceTypes: ["image"],
				};

			compressionRuleCondition =
				enhanceRuleConditionWithResponseHeadersCondition(
					browserMajor,
					compressionRuleCondition,
				);

			const possibleHostCookies = await getCookieStringForSiteDomain(host);

			const rules: Browser.declarativeNetRequest.Rule[] = [
				{
					action: {
						redirect: {
							regexSubstitution: proxyUrl,
						},
						type: "redirect",
					},
					condition: compressionRuleCondition,
					id: compressionId,
					// High so it can override some static/session exemptions when desired
					priority: DeclarativeNetRequestPriority.HIGH,
				},
			];

			// Patch the redirected request with the cookies
			if (possibleHostCookies) {
				rules.push({
					action: {
						requestHeaders: [
							{
								header: ProxyCustomHeaders.DNR_COOKIE_STRING,
								operation: "set",
								value: possibleHostCookies,
							},
						],
						type: "modifyHeaders",
					},
					condition: {
						initiatorDomains: [host],
						requestDomains: [proxyDomain],
						// Target only our proxy endpoint + parameters (and avoid matching other proxy routes).
						urlFilter: `${proxyUrlPrefix}*`,
					},
					id: cookiesSyncId,
					priority: DeclarativeNetRequestPriority.HIGH,
				});
			}

			return rules;
		}

		default:
			return [];
	}
}

export async function applyDefaultCompressionRules(
	payload: DefaultDnrRuleModifierPayload,
): Promise<void> {
	const rule = buildDefaultCompressionRule(payload);

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: rule ? [rule] : undefined,
		removeRuleIds: [DeclarativeNetRequestRuleIds.DEFAULT_COMPRESSION_MODE],
	});
}

export async function applySiteScopedCompressionRules([
	host,
	{ compression, general, ids, proxy, browserMajor },
]: SiteScopedDnrRuleModifierPayloadEntry): Promise<void> {
	const rule = await buildSiteScopedCompressionRule({
		browserMajor,
		compression,
		general,
		host,
		ids,
		proxy,
	});

	await browser.declarativeNetRequest.updateSessionRules({
		addRules: rule.length ? rule : undefined,
		removeRuleIds: [ids.compression, ids.cookieSync],
	});
}
