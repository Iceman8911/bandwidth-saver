/** biome-ignore-all lint/style/useLiteralEnumMembers: <I like it:p> */
import { type ObjectToEnum, UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";

export enum ExtensionData {
	NAME = "Bandwidth Saver and Monitor",
	VERSION = 1,
}

export const DUMMY_TAB_URL = v.parse(UrlSchema, "https://foo.bar");

export const getActiveTabUrl = async () => {
	try {
		return (await getActiveTabOrigin()) ?? DUMMY_TAB_URL;
	} catch {
		return v.parse(UrlSchema, location.href);
	}
};

export const MessageType = {
	/** Sends the bandwidth used from content scripts to the background */
	MONITOR_BANDWIDTH_WITH_PERFORMANCE_API: "1",
	/** Check if the url returns a valid response code */
	VALIDATE_URL: "0",

	// MONITOR_BANDWIDTH_WITH_WEB_REQUEST = "2",
} as const;
export type MessageType = ObjectToEnum<typeof MessageType>;

export const CompressionMode = {
	/** Uses `declartiveNetRequest` to redirect requests to a remote proxy running the code from the `proxy` package, which will handle the rest.
	 *
	 */
	PROXY: "proxy",

	/** Uses `declartiveNetRequest` to redirect requests to a single compressor endpoint.
	 *
	 * 	Failed redirects on `img` elements fall back to the original url
	 */
	SIMPLE: "simple",

	/** Only avaible for MV2.
	 *
	 * Uses `webRequestBlocking` to modify and redirect requests to any working endpoint.
	 */
	WEB_REQUEST: "mv2",
} as const;
export type CompressionMode = ObjectToEnum<typeof CompressionMode>;

export const StorageKey = {
	/** Default settings for blocking assets */
	DEFAULT_SETTINGS_BLOCK: "sync:block",

	/** Default settings for customizing compression */
	DEFAULT_SETTINGS_COMPRESSION: "sync:compression",

	/** Other default generic settings beyond the other classifications */
	DEFAULT_SETTINGS_GENERAL: "sync:general",

	/** Default settings for the remote proxy that requests will be redirected to */
	DEFAULT_SETTINGS_PROXY: "sync:proxy",

	SCHEMA_VERSION: "sync:schemaVersion",

	/** Site-specific settings for blocking assets */
	SITE_SPECIFIC_SETTINGS_BLOCK_PREFIX: "sync:siteScopeBlock-",

	/** Site-specific settings for customizing compression */
	SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX: "sync:siteScopeCompression-",

	/** Site-specific settings toggles scoped to a site */
	SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX: "sync:siteScopeGeneral-",

	/** Site-specific settings for the remote proxy that requests will be redirected to */
	SITE_SPECIFIC_SETTINGS_PROXY_PREFIX: "sync:siteScopeProxy-",

	/** Device-specific statistics per site */
	SITE_SPECIFIC_STATISTICS_PREFIX: "local:siteScopeStatistics-",

	/** Device-specific global statistics */
	STATISTICS: "local:statistics",
} as const satisfies Record<string, StorageItemKey>;
export type StorageKey = ObjectToEnum<typeof StorageKey>;

export type SiteSpecificStorageKey =
	| typeof StorageKey.SITE_SPECIFIC_SETTINGS_BLOCK_PREFIX
	| typeof StorageKey.SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX
	| typeof StorageKey.SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX
	| typeof StorageKey.SITE_SPECIFIC_SETTINGS_PROXY_PREFIX
	| typeof StorageKey.SITE_SPECIFIC_STATISTICS_PREFIX;

export enum DeclarativeNetRequestRuleIds {
	_MAX_NUMBER_OF_REGEX_RULES = 1000,
	/** Uses regex as the limit cus most of the rules will be regex-related anyway */
	_DECLARATIVE_NET_REQUEST_RULE_ID_RANGE = _MAX_NUMBER_OF_REGEX_RULES / 8,

	DEFAULT_SAVE_DATA_HEADER = 1,
	SITE_SAVE_DATA_HEADER,
	_$END_SITE_SAVE_DATA_HEADER = SITE_SAVE_DATA_HEADER +
		_DECLARATIVE_NET_REQUEST_RULE_ID_RANGE,

	GLOBAL_COMPRESSION_MODE_SIMPLE,
	SITE_COMPRESSION_MODE_SIMPLE,
	_$END_SITE_COMPRESSION_MODE_SIMPLE = SITE_COMPRESSION_MODE_SIMPLE +
		_DECLARATIVE_NET_REQUEST_RULE_ID_RANGE,

	GLOBAL_COMPRESSION_MODE_PROXY,
	SITE_COMPRESSION_MODE_PROXY,
	_$END_SITE_COMPRESSION_MODE_PROXY = SITE_COMPRESSION_MODE_PROXY +
		_DECLARATIVE_NET_REQUEST_RULE_ID_RANGE,

	GLOBAL_COMPRESSION_MODE_MV2,
	SITE_COMPRESSION_MODE_MV2_REMOVE,
	_$END_SITE_COMPRESSION_MODE_MV2_REMOVE = SITE_COMPRESSION_MODE_MV2_REMOVE +
		_DECLARATIVE_NET_REQUEST_RULE_ID_RANGE,

	/** CSP removal for sites that block external image sources
	 *
	 * I've only seen need of it for sites like discord, and ofc I'll warn the user of the dangers of enabling this
	 *
	 */
	GLOBAL_BYPASS_CSP_BLOCKING,
	SITE_BYPASS_CSP_BLOCKING,
	_$END_SITE_BYPASS_CSP_BLOCKING = SITE_BYPASS_CSP_BLOCKING +
		_DECLARATIVE_NET_REQUEST_RULE_ID_RANGE,

	EXEMPT_WHITELISTED_DOMAINS_FROM_COMPRESSION,
	EXEMPT_FLAGGED_REQUESTS,
	EXEMPT_FAVICONS_FROM_COMPRESSION,
	EXEMPT_COMPRESSION_ENDPOINTS_FROM_COMPRESSION,
	EXEMPT_SVGS_FROM_COMPRESSION,
}

export enum DeclarativeNetRequestPriority {
	LOWEST = 1,
	LOW,
	MID,
	HIGH,
	HIGHEST,
}

export const UPDATE_INTERVAL_IN_MS = 1000 * 60 * 60;

/** A no-op rule condition that matches no requests.
 *
 * Uses an impossible domain to ensure the rule never triggers.
 * Useful for site-specific rules where the feature is disabled but we still need a valid rule.
 */
export const NOOP_RULE_CONDITION = {
	requestDomains: ["never-ever-match.invalid"],
} as const satisfies Browser.declarativeNetRequest.RuleCondition;

export const MAX_DAYS_OF_DAILY_STATISTICS = 90;
