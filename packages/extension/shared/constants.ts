import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";

export const STORAGE_VERSION = 1;

export const DUMMY_TAB_URL = v.parse(UrlSchema, "foo://bar");

export const ACTIVE_TAB_URL = async () =>
	(await getActiveTabOrigin()) ?? DUMMY_TAB_URL;

export enum MessageType {
	/** Check if the url returns a valid response code */
	VALIDATE_URL = "0",

	/** Sends the bandwidth used from content scripts to the background */
	MONITOR_BANDWIDTH_WITH_PERFORMANCE_API = "1",

	// MONITOR_BANDWIDTH_WITH_WEB_REQUEST = "2",
}

export enum CompressionMode {
	/** Uses `declartiveNetRequest` to redirect requests to a single compressor endpoint.
	 *
	 * 	Failed redirects on `img` elements fall back to the original url
	 */
	SIMPLE,

	/** Only avaible for MV2.
	 *
	 * Uses `webRequestBlocking` to modify and redirect requests to any working endpoint.
	 */
	WEB_REQUEST,

	/** Patches globals to redirect most image requests.
	 *
	 * Rather brittle but it's 100% client side and MV3 compatible.
	 */
	MONKEY_PATCH,

	/** Uses `declartiveNetRequest` to redirect requests to a remote proxy running the code from the `proxy` package, which will handle the rest.
	 *
	 */
	PROXY,
}

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
	SETTINGS_SITE_SCOPE_BLOCK: "sync:siteScopeBlock",

	/** Compression settings scoped to a site */
	SETTINGS_SITE_SCOPE_COMPRESSION: "sync:siteScopeCompression",

	/** "Global" settings scoped to a site that didn't quite fit with the other storage areas */
	SETTINGS_SITE_SCOPE_GLOBAL: "sync:siteScopeGlobal",

	/** Proxy settings scoped to a site */
	SETTINGS_SITE_SCOPE_PROXY: "sync:siteScopeProxy",

	/** Device-specific global statistics */
	STATISTICS: "local:statistics",

	/** Device-specific statistics per site */
	STATISTICS_SITE_SCOPE: "local:siteScopeStatistics",
} as const satisfies Record<string, StorageItemKey>;
export type StorageKey = (typeof StorageKey)[keyof typeof StorageKey];

export enum DeclarativeNetRequestRuleIds {
	ADD_SAVE_DATA_HEADER = 1,

	REDIRECT_TO_SIMPLE_COMPRESSION_ENDPOINT,

	/** Disables related rules since `declartiveNetRequest` will not be used */
	ENABLE_WEB_REQUEST,

	/** Disables related rules since code for this runs on the client-page itself */
	ENABLE_MONKEY_PATCH,

	REDIRECT_TO_REMOTE_POXY,
}
