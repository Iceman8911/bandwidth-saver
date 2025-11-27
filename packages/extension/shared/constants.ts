import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";

export const STORAGE_VERSION = 1;

export const DUMMY_TAB_URL = v.parse(UrlSchema, "foo://bar");

export const ACTIVE_TAB_URL = async () =>
	(await getActiveTabOrigin()) ?? DUMMY_TAB_URL;

export const MessageType = {
	/** Sends the bandwidth used from content scripts to the background */
	MONITOR_BANDWIDTH_WITH_PERFORMANCE_API: "1",
	/** Check if the url returns a valid response code */
	VALIDATE_URL: "0",

	// MONITOR_BANDWIDTH_WITH_WEB_REQUEST = "2",
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const CompressionMode = {
	/** Patches globals to redirect most image requests.
	 *
	 * Rather brittle but it's 100% client side and MV3 compatible.
	 */
	MONKEY_PATCH: 1,

	/** Uses `declartiveNetRequest` to redirect requests to a remote proxy running the code from the `proxy` package, which will handle the rest.
	 *
	 */
	PROXY: 2,
	/** Uses `declartiveNetRequest` to redirect requests to a single compressor endpoint.
	 *
	 * 	Failed redirects on `img` elements fall back to the original url
	 */
	SIMPLE: 3,

	/** Only avaible for MV2.
	 *
	 * Uses `webRequestBlocking` to modify and redirect requests to any working endpoint.
	 */
	WEB_REQUEST: 4,
} as const;
export type CompressionMode =
	(typeof CompressionMode)[keyof typeof CompressionMode];

export const StorageKey = {
	SCHEMA_VERSION: "sync:schemaVersion",

	/** Settings for blocking assets */
	SETTINGS_BLOCK: "sync:block",

	/** Settings for customizing compression */
	SETTINGS_COMPRESSION: "sync:compression",

	/** Other settings that affect all site domains that didn't fit with the others */
	SETTINGS_GLOBAL: "sync:global",

	/** Settings for the remote proxy that requests will be redirected to */
	SETTINGS_PROXY: "sync:proxy",

	/** Block settings scoped to a site */
	SITE_SCOPE_SETTINGS_BLOCK_PREFIX: "sync:siteScopeBlock-",

	/** Compression settings scoped to a site */
	SITE_SCOPE_SETTINGS_COMPRESSION_PREFIX: "sync:siteScopeCompression-",

	/** "Global" settings scoped to a site that didn't quite fit with the other storage areas */
	SITE_SCOPE_SETTINGS_GLOBAL_PREFIX: "sync:siteScopeGlobal-",

	/** Proxy settings scoped to a site */
	SITE_SCOPE_SETTINGS_PROXY_PREFIX: "sync:siteScopeProxy-",

	/** Device-specific statistics per site */
	SITE_SCOPE_STATISTICS_PREFIX: "local:siteScopeStatistics-",

	/** Device-specific global statistics */
	STATISTICS: "local:statistics",
} as const satisfies Record<string, StorageItemKey>;
export type StorageKey = (typeof StorageKey)[keyof typeof StorageKey];

export const DeclarativeNetRequestRuleIds = {
	ADD_SAVE_DATA_HEADER: 1,

	/** Disables related rules since code for this runs on the client-page itself */
	ENABLE_MONKEY_PATCH: 2,

	/** Disables related rules since `declartiveNetRequest` will not be used */
	ENABLE_WEB_REQUEST: 3,

	REDIRECT_TO_REMOTE_PROXY: 4,

	REDIRECT_TO_SIMPLE_COMPRESSION_ENDPOINT: 5,
};
