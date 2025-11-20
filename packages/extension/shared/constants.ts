export const STORAGE_VERSION = 1;

export enum MessageType {
	/** Check if the url returns a valid response code */
	VALIDATE_URL,
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
	SCHEMA_VERSION: "local:schemaVersion",

	/** Settings for blocking assets */
	SETTINGS_BLOCK: "local:block",

	/** Settings for customizing compression */
	SETTINGS_COMPRESSION: "local:compression",

	/** Sites that shouldn't be affected by the extension */
	SETTINGS_DENYLIST: "local:denylist",

	/** Other settings that affect all site domains that didn't fit with the others */
	SETTINGS_GLOBAL: "local:global",

	/** Settings for the remote proxy */
	SETTINGS_PROXY: "local:proxy",

	/** Settings scoped to specific sites */
	SETTINGS_SITE_SCOPE: "local:siteScope",

	/** Device-specific global statistics */
	STATISTICS: "local:statistics",

	/** Device-specific statistics per site */
	STATISTICS_SITE_SCOPE: "local:siteScopeStatistics",
} as const satisfies Record<string, StorageItemKey>;
export type StorageKey = (typeof StorageKey)[keyof typeof StorageKey];
