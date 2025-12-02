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
export type StorageKey = ObjectToEnum<typeof StorageKey>;

export enum DeclarativeNetRequestRuleIds {
	GLOBAL_SAVE_DATA_HEADER = 1,
	SITE_SAVE_DATA_HEADER,

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
}

export enum DeclarativeNetRequestPriority {
	LOWEST = 1,
	LOW,
	MID,
	HIGH,
	HIGHEST,
}
