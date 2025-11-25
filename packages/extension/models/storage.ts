import {
	type AnyValibotSchema,
	getExtensionEnv,
	ImageCompressorEndpoint,
	ImageFormatSchema,
	NumberBetween1and100Inclusively,
	UrlSchema,
} from "@bandwidth-saver/shared";
import * as v from "valibot";
import {
	CompressionMode,
	STORAGE_VERSION,
	StorageKey,
} from "@/shared/constants";

const EnabledSettingsSchema = v.object({ enabled: v.boolean() });

const GlobalSettingsSchema = v.object({ ...EnabledSettingsSchema.entries });

const CompressionSettingsSchema = v.object({
	...EnabledSettingsSchema.entries,

	/** `auto` results in default behaviour and is the fallback if a chosen format does not exist on a compression endpoint */
	format: ImageFormatSchema,
	mode: v.enum(CompressionMode),

	/** Used in `simple` mode since we can't dynamically calculate the one to use */
	preferredEndpoint: v.enum(ImageCompressorEndpoint),
	preserveAnim: v.boolean(),
	quality: NumberBetween1and100Inclusively,
});

const ProxySettingsSchema = v.object({
	...EnabledSettingsSchema.entries,
	host: v.pipe(v.string(), v.minLength(1), v.trim()),
	port: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65535)),
});

const BlockedAssetSharedSchema = v.object({
	...EnabledSettingsSchema.entries,
	minSize: v.pipe(v.number(), v.minValue(0)),
});

const BlockedAssetSchema = v.variant("type", [
	v.object({
		...BlockedAssetSharedSchema.entries,
		fileType: v.picklist(["audio", "font", "image", "video"]),
		type: v.literal("type"),
	}),

	v.object({
		...BlockedAssetSharedSchema.entries,
		extension: v.string(),
		type: v.literal("ext"),
	}),

	// Block by MIME type pattern
	v.object({
		...BlockedAssetSharedSchema.entries,
		mimePattern: v.string(), // e.g., "application/pdf", "text/*"
		type: v.literal("mime"),
	}),

	// Block by URL pattern (domain, path, etc.)
	v.object({
		...BlockedAssetSharedSchema.entries,
		type: v.literal("url"),
		urlPattern: v.string(), // e.g., "*.doubleclick.net/*", "cdn.analytics.com/*"
	}),
]);

const BlockSettingsSchema = v.array(BlockedAssetSchema);

const IntegerFromAtLeastZeroSchema = v.pipe(
	v.number(),
	v.integer(),
	v.minValue(0),
);

export const AssetStatisticsSchema = v.object({
	audio: IntegerFromAtLeastZeroSchema,
	font: IntegerFromAtLeastZeroSchema,
	html: IntegerFromAtLeastZeroSchema,
	image: IntegerFromAtLeastZeroSchema,
	other: IntegerFromAtLeastZeroSchema,
	script: IntegerFromAtLeastZeroSchema,
	style: IntegerFromAtLeastZeroSchema,
	video: IntegerFromAtLeastZeroSchema,
});
export type AssetStatisticsSchema = v.InferOutput<typeof AssetStatisticsSchema>;

const StatisticsSchema = v.object({
	// Maybe I can monitor the original requests for their (content-length) before the redirect? But this is be pretty inaccurate anyway since some sites just don't include it.
	bytesSaved: AssetStatisticsSchema,

	/** Total amount of data consumption after compression / blocking */
	bytesUsed: AssetStatisticsSchema,

	lastReset: v.optional(v.pipe(v.string(), v.isoTimestamp())),

	/** Amount of requests blocked */
	requestsBlocked: AssetStatisticsSchema,

	/** Amount of non-cached requests re-routed to the compression service */
	requestsCompressed: AssetStatisticsSchema,

	/** Amount of non-cached requests made by site(s) in total */
	requestsMade: IntegerFromAtLeastZeroSchema,
});

const SiteScopeBlockSchema = v.record(UrlSchema, BlockSettingsSchema);
const SiteScopeCompressionSchema = v.record(
	UrlSchema,
	CompressionSettingsSchema,
);
const SiteScopeGlobalSchema = v.record(UrlSchema, GlobalSettingsSchema);
const SiteScopeProxySchema = v.record(UrlSchema, ProxySettingsSchema);
const StatisticsSiteScopeSchema = v.record(UrlSchema, StatisticsSchema);

const SchemaVersionSchema = v.pipe(v.number(), v.integer(), v.minValue(1));

export const STORAGE_SCHEMA = {
	[StorageKey.SETTINGS_GLOBAL]: GlobalSettingsSchema,
	[StorageKey.SETTINGS_COMPRESSION]: CompressionSettingsSchema,
	[StorageKey.SETTINGS_PROXY]: ProxySettingsSchema,
	[StorageKey.SETTINGS_BLOCK]: BlockSettingsSchema,
	[StorageKey.SETTINGS_SITE_SCOPE_BLOCK]: SiteScopeBlockSchema,
	[StorageKey.SETTINGS_SITE_SCOPE_COMPRESSION]: SiteScopeCompressionSchema,
	[StorageKey.SETTINGS_SITE_SCOPE_GLOBAL]: SiteScopeGlobalSchema,
	[StorageKey.SETTINGS_SITE_SCOPE_PROXY]: SiteScopeProxySchema,
	[StorageKey.STATISTICS]: StatisticsSchema,
	[StorageKey.STATISTICS_SITE_SCOPE]: StatisticsSiteScopeSchema,
	[StorageKey.SCHEMA_VERSION]: SchemaVersionSchema,
} as const satisfies Record<StorageKey, AnyValibotSchema>;

const { VITE_SERVER_HOST, VITE_SERVER_PORT } = getExtensionEnv();

const DEFAULT_GLOBAL_SETTINGS = v.parse(GlobalSettingsSchema, {
	enabled: true,
} as const satisfies v.InferOutput<typeof GlobalSettingsSchema>);

const DEFAULT_COMPRESSION_SETTINGS = v.parse(CompressionSettingsSchema, {
	enabled: true,
	format: "auto",
	mode: CompressionMode.SIMPLE,
	preferredEndpoint: ImageCompressorEndpoint.WSRV_NL,
	preserveAnim: false,
	quality: 60,
} as const satisfies v.InferOutput<typeof CompressionSettingsSchema>);

const DEFAULT_PROXY_SETTINGS = v.parse(ProxySettingsSchema, {
	enabled: false,
	host: VITE_SERVER_HOST,
	port: VITE_SERVER_PORT,
} as const satisfies v.InferOutput<typeof ProxySettingsSchema>);

const DEFAULT_BLOCK_SETTINGS = v.parse(BlockSettingsSchema, [
	{ enabled: false, fileType: "audio", minSize: 100, type: "type" },
	{ enabled: false, fileType: "font", minSize: 50, type: "type" },
	{ enabled: false, fileType: "image", minSize: 100, type: "type" },
	{ enabled: false, fileType: "video", minSize: 100, type: "type" },
] as const satisfies v.InferOutput<typeof BlockSettingsSchema>);

export const DEFAULT_ASSET_STATISTICS = v.parse(AssetStatisticsSchema, {
	audio: 0,
	font: 0,
	html: 0,
	image: 0,
	other: 0,
	script: 0,
	style: 0,
	video: 0,
} as const satisfies AssetStatisticsSchema);

const DEFAULT_STATISTICS = v.parse(StatisticsSchema, {
	bytesSaved: { ...DEFAULT_ASSET_STATISTICS },
	bytesUsed: { ...DEFAULT_ASSET_STATISTICS },
	requestsBlocked: { ...DEFAULT_ASSET_STATISTICS },
	requestsCompressed: { ...DEFAULT_ASSET_STATISTICS },
	requestsMade: 0,
} as const satisfies v.InferOutput<typeof StatisticsSchema>);

const DEFAULT_STATISTICS_SITE_SCOPE = v.parse(
	StatisticsSiteScopeSchema,
	{} as const satisfies v.InferOutput<typeof StatisticsSiteScopeSchema>,
);

const DEFAULT_SCHEMA_VERSION = v.parse(SchemaVersionSchema, STORAGE_VERSION);

const DEFAULT_SITE_SCOPE_BLOCK = v.parse(
	SiteScopeBlockSchema,
	{} as const satisfies v.InferOutput<typeof SiteScopeBlockSchema>,
);

const DEFAULT_SITE_SCOPE_COMPRESSION = v.parse(
	SiteScopeCompressionSchema,
	{} as const satisfies v.InferOutput<typeof SiteScopeCompressionSchema>,
);

const DEFAULT_SITE_SCOPE_GLOBAL = v.parse(
	SiteScopeGlobalSchema,
	{} as const satisfies v.InferOutput<typeof SiteScopeGlobalSchema>,
);

const DEFAULT_SITE_SCOPE_PROXY = v.parse(
	SiteScopeProxySchema,
	{} as const satisfies v.InferOutput<typeof SiteScopeProxySchema>,
);

export const STORAGE_DEFAULTS = {
	[StorageKey.SETTINGS_GLOBAL]: DEFAULT_GLOBAL_SETTINGS,
	[StorageKey.SETTINGS_COMPRESSION]: DEFAULT_COMPRESSION_SETTINGS,
	[StorageKey.SETTINGS_PROXY]: DEFAULT_PROXY_SETTINGS,
	[StorageKey.SETTINGS_BLOCK]: DEFAULT_BLOCK_SETTINGS,
	[StorageKey.STATISTICS]: DEFAULT_STATISTICS,
	[StorageKey.STATISTICS_SITE_SCOPE]: DEFAULT_STATISTICS_SITE_SCOPE,
	[StorageKey.SCHEMA_VERSION]: DEFAULT_SCHEMA_VERSION,
	[StorageKey.SETTINGS_SITE_SCOPE_BLOCK]: DEFAULT_SITE_SCOPE_BLOCK,
	[StorageKey.SETTINGS_SITE_SCOPE_COMPRESSION]: DEFAULT_SITE_SCOPE_COMPRESSION,
	[StorageKey.SETTINGS_SITE_SCOPE_GLOBAL]: DEFAULT_SITE_SCOPE_GLOBAL,
	[StorageKey.SETTINGS_SITE_SCOPE_PROXY]: DEFAULT_SITE_SCOPE_PROXY,
} as const satisfies {
	[STORAGE_KEY in keyof typeof STORAGE_SCHEMA]: v.InferOutput<
		(typeof STORAGE_SCHEMA)[STORAGE_KEY]
	>;
};
