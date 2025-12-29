import {
	type AnyValibotSchema,
	clone,
	getExtensionEnv,
	ImageCompressorEndpoint,
	ImageFormatSchema,
	NumberBetween1and100Inclusively,
	UrlSchema,
} from "@bandwidth-saver/shared";
import * as v from "valibot";
import { CompressionMode, ExtensionData, StorageKey } from "@/shared/constants";

export const StorageAreaSchema = v.picklist([
	"local",
	"sync",
	"managed",
	"session",
]);
export type StorageAreaSchema = v.InferOutput<typeof StorageAreaSchema>;

const GeneralSettingsSchema = v.object({
	/** If  disabled, all blocking rules are effectively disabled */
	block: v.boolean(),

	/** Whether the csp headers should be removed.
	 *
	 * NOT ADVISED unless you know what you're doing.
	 */
	bypassCsp: v.boolean(),

	/** If disabled, no compression at all is applied */
	compression: v.boolean(),

	/** If `false`, completely disables all functionality for the default / site-specific settings */
	enabled: v.boolean(),

	/** If `true`, modifies all relevant html elements to lazily load their content and also sets up a mutation observer for dynamically inserted elements */
	lazyLoad: v.boolean(),

	/** If `true`, disables autoplaying of videos and audio  */
	noAutoplay: v.boolean(),

	/** The offset of the rule id to use for this site.
	 *
	 * If `null`, the default rule is used
	 */
	ruleIdOffset: v.union([v.number(), v.null()]),

	/** Whether the save data header should be applied to each request */
	saveData: v.boolean(),
});

const CompressionSettingsSchema = v.object({
	/** `auto` results in default behaviour and is the fallback if a chosen format does not exist on a compression endpoint */
	format: ImageFormatSchema,
	mode: v.enum(CompressionMode),

	/** Used in `simple` mode since we can't dynamically calculate the one to use */
	preferredEndpoint: v.enum(ImageCompressorEndpoint),
	preserveAnim: v.boolean(),
	quality: NumberBetween1and100Inclusively,
});

const ProxySettingsSchema = v.object({
	host: v.pipe(v.string(), v.minLength(1), v.trim()),
	port: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65535)),
});

const IntegerFromAtLeastZeroSchema = v.pipe(
	v.number(),
	v.integer(),
	v.minValue(0),
);

export const SingleAssetStatisticsSchema = v.object({
	audio: IntegerFromAtLeastZeroSchema,
	font: IntegerFromAtLeastZeroSchema,
	html: IntegerFromAtLeastZeroSchema,
	image: IntegerFromAtLeastZeroSchema,
	other: IntegerFromAtLeastZeroSchema,
	script: IntegerFromAtLeastZeroSchema,
	style: IntegerFromAtLeastZeroSchema,
	video: IntegerFromAtLeastZeroSchema,
});
export type SingleAssetStatisticsSchema = v.InferOutput<
	typeof SingleAssetStatisticsSchema
>;

export const CombinedAssetStatisticsSchema = v.object({
	/** Sum of older entries that will no longer be recorded individually (~after 90 days) */
	aggregate: SingleAssetStatisticsSchema,

	/** Indexed with the day in milliseconds */
	dailyStats: v.record(
		v.pipe(v.string(), v.transform(Number), v.number()),
		SingleAssetStatisticsSchema,
	),
});
export type CombinedAssetStatisticsSchema = v.InferOutput<
	typeof CombinedAssetStatisticsSchema
>;

const StatisticsSchema = v.object({
	// Maybe I can monitor the original requests for their (content-length) before the redirect? But this is be pretty inaccurate anyway since some sites just don't include it.
	bytesSaved: CombinedAssetStatisticsSchema,

	/** Total amount of data consumption after compression / blocking */
	bytesUsed: CombinedAssetStatisticsSchema,

	lastReset: v.optional(v.pipe(v.string(), v.isoTimestamp())),

	/** Amount of non-cached requests re-routed to the compression service */
	requestsCompressed: CombinedAssetStatisticsSchema,

	/** Amount of non-cached requests made by site(s) in total */
	requestsMade: CombinedAssetStatisticsSchema,
});

const DetailedStatisticsSchema = v.object({
	...StatisticsSchema.entries,

	/** Requests from external sources that should technically be counted under the host's origin and not their standalone entries since they were created there.
	 *
	 * The url keys are also their url origin, (otherwise there'd be way too many bloat entries)
	 */
	crossOrigin: v.record(UrlSchema, CombinedAssetStatisticsSchema),
});

const SchemaVersionSchema = v.pipe(v.number(), v.integer(), v.minValue(1));

export const STORAGE_SCHEMA = {
	[StorageKey.DEFAULT_SETTINGS_COMPRESSION]: CompressionSettingsSchema,
	[StorageKey.DEFAULT_SETTINGS_PROXY]: ProxySettingsSchema,
	[StorageKey.DEFAULT_SETTINGS_GENERAL]: GeneralSettingsSchema,

	[StorageKey.SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX]:
		CompressionSettingsSchema,
	[StorageKey.SITE_SPECIFIC_SETTINGS_PROXY_PREFIX]: ProxySettingsSchema,
	[StorageKey.SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX]: GeneralSettingsSchema,

	[StorageKey.STATISTICS]: StatisticsSchema,
	[StorageKey.SITE_SPECIFIC_STATISTICS_PREFIX]: DetailedStatisticsSchema,

	[StorageKey.SCHEMA_VERSION]: SchemaVersionSchema,
} as const satisfies Record<StorageKey, AnyValibotSchema>;

const { VITE_SERVER_HOST, VITE_SERVER_PORT } = getExtensionEnv();

export const DEFAULT_COMPRESSION_SETTINGS = v.parse(CompressionSettingsSchema, {
	format: "webp",
	mode: CompressionMode.SIMPLE,
	preferredEndpoint: ImageCompressorEndpoint.WSRV_NL,
	preserveAnim: false,
	quality: 60,
} as const satisfies v.InferOutput<typeof CompressionSettingsSchema>);

export const DEFAULT_PROXY_SETTINGS = v.parse(ProxySettingsSchema, {
	host: VITE_SERVER_HOST,
	port: VITE_SERVER_PORT,
} as const satisfies v.InferOutput<typeof ProxySettingsSchema>);

export const DEFAULT_GENERAL_SETTINGS = v.parse(GeneralSettingsSchema, {
	block: true,
	bypassCsp: false,
	compression: true,
	enabled: true,
	lazyLoad: true,
	noAutoplay: true,
	ruleIdOffset: null,
	saveData: true,
} as const satisfies v.InferOutput<typeof GeneralSettingsSchema>);

export const DEFAULT_SINGLE_ASSET_STATISTICS = v.parse(
	SingleAssetStatisticsSchema,
	{
		audio: 0,
		font: 0,
		html: 0,
		image: 0,
		other: 0,
		script: 0,
		style: 0,
		video: 0,
	} as const satisfies SingleAssetStatisticsSchema,
);

export const DEFAULT_COMBINED_ASSET_STATISTICS = v.parse(
	CombinedAssetStatisticsSchema,
	{
		aggregate: { ...DEFAULT_SINGLE_ASSET_STATISTICS },
		dailyStats: [],
	} as const satisfies CombinedAssetStatisticsSchema,
);

export const DEFAULT_STATISTICS = v.parse(StatisticsSchema, {
	bytesSaved: { ...DEFAULT_COMBINED_ASSET_STATISTICS },
	bytesUsed: { ...DEFAULT_COMBINED_ASSET_STATISTICS },
	requestsCompressed: { ...DEFAULT_COMBINED_ASSET_STATISTICS },
	requestsMade: { ...DEFAULT_COMBINED_ASSET_STATISTICS },
} as const satisfies v.InferOutput<typeof StatisticsSchema>);

export const DEFAULT_SITE_SPECIFIC_STATISTICS = v.parse(
	DetailedStatisticsSchema,
	{ ...DEFAULT_STATISTICS, crossOrigin: {} } as const satisfies v.InferOutput<
		typeof DetailedStatisticsSchema
	>,
);

const DEFAULT_SCHEMA_VERSION = v.parse(
	SchemaVersionSchema,
	ExtensionData.VERSION,
);

export const STORAGE_DEFAULTS = {
	[StorageKey.DEFAULT_SETTINGS_COMPRESSION]: clone(
		DEFAULT_COMPRESSION_SETTINGS,
	),
	[StorageKey.DEFAULT_SETTINGS_PROXY]: clone(DEFAULT_PROXY_SETTINGS),
	[StorageKey.DEFAULT_SETTINGS_GENERAL]: clone(DEFAULT_GENERAL_SETTINGS),

	[StorageKey.SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX]: clone(
		DEFAULT_COMPRESSION_SETTINGS,
	),
	[StorageKey.SITE_SPECIFIC_SETTINGS_PROXY_PREFIX]: clone(
		DEFAULT_PROXY_SETTINGS,
	),
	[StorageKey.SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX]: clone(
		DEFAULT_GENERAL_SETTINGS,
	),

	[StorageKey.STATISTICS]: clone(DEFAULT_STATISTICS),
	[StorageKey.SITE_SPECIFIC_STATISTICS_PREFIX]: clone(
		DEFAULT_SITE_SPECIFIC_STATISTICS,
	),

	[StorageKey.SCHEMA_VERSION]: DEFAULT_SCHEMA_VERSION,
} as const satisfies {
	[STORAGE_KEY in keyof typeof STORAGE_SCHEMA]: v.InferOutput<
		(typeof STORAGE_SCHEMA)[STORAGE_KEY]
	>;
};
