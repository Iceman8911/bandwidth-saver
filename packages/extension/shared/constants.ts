import { type ObjectToEnum, UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";

export const STORAGE_VERSION = 1;

export const DUMMY_TAB_URL = v.parse(UrlSchema, "https://foo.bar");

export const ACTIVE_TAB_URL = async () =>
	(await getActiveTabOrigin()) ?? DUMMY_TAB_URL;

export const MessageType = {
	/** Sends the bandwidth used from content scripts to the background */
	MONITOR_BANDWIDTH_WITH_PERFORMANCE_API: "1",
	/** Check if the url returns a valid response code */
	VALIDATE_URL: "0",

	// MONITOR_BANDWIDTH_WITH_WEB_REQUEST = "2",
} as const;
export type MessageType = ObjectToEnum<typeof MessageType>;

export const CompressionMode = {
	/** Patches globals to redirect most image requests.
	 *
	 * Rather brittle but it's 100% client side and MV3 compatible.
	 */
	MONKEY_PATCH: "patch",

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
	SCHEMA_VERSION: "sync:schemaVersion",

	/** Settings for blocking assets */
	SETTINGS_BLOCK: "sync:block",

	/** Settings for customizing compression */
	SETTINGS_COMPRESSION: "sync:compression",

	/** Other generic settings beyond the other classifications */
	SETTINGS_GLOBAL: "sync:global",

	/** Settings for the remote proxy that requests will be redirected to */
	SETTINGS_PROXY: "sync:proxy",

	/** Settings toggles scoped to a site */
	SITE_SPECIFIC_SETTINGS_PREFIX: "sync:siteScopeSettings-",

	/** Device-specific statistics per site */
	SITE_SPECIFIC_STATISTICS_PREFIX: "local:siteScopeStatistics-",

	/** Device-specific global statistics */
	STATISTICS: "local:statistics",
} as const satisfies Record<string, StorageItemKey>;
export type StorageKey = ObjectToEnum<typeof StorageKey>;

export enum DeclarativeNetRequestRuleIds {
	GLOBAL_SAVE_DATA_HEADER = 1,
	SITE_SAVE_DATA_HEADER_ADD,
	SITE_SAVE_DATA_HEADER_REMOVE,

	GLOBAL_COMPRESSION_MODE_SIMPLE,
	SITE_COMPRESSION_MODE_SIMPLE_ADD,
	SITE_COMPRESSION_MODE_SIMPLE_REMOVE,

	GLOBAL_COMPRESSION_MODE_PATCH,
	SITE_COMPRESSION_MODE_PATCH_ADD,
	SITE_COMPRESSION_MODE_PATCH_REMOVE,

	GLOBAL_COMPRESSION_MODE_PROXY,
	SITE_COMPRESSION_MODE_PROXY_ADD,
	SITE_COMPRESSION_MODE_PROXY_REMOVE,

	GLOBAL_COMPRESSION_MODE_MV2,
	SITE_COMPRESSION_MODE_MV2_REMOVE,

	EXEMPT_WHITELISTED_DOMAINS_FROM_COMPRESSION,
	EXEMPT_FLAGGED_REQUESTS,

	/** CSP removal for sites that block external image sources
	 *
	 * I've only seen need of it for sites like discord, and ofc I'll warn the user of the dangers of enabling this
	 *
	 */
	GLOBAL_BYPASS_CSP_BLOCKING,
	SITE_BYPASS_CSP_BLOCKING_ADD,
	SITE_BYPASS_CSP_BLOCKING_REMOVE,
}

export enum DeclarativeNetRequestPriority {
	LOWEST = 1,
	LOW,
	MID,
	HIGH,
	HIGHEST,
}

export const UPDATE_INTERVAL_IN_MS = 1000 * 60 * 60;
