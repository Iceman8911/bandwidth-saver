import {
	getExtensionEnv,
	ImageCompressorEndpoint,
	ImageFormatSchema,
	NumberBetween1and100Inclusively,
	UrlSchema,
} from "@bandwidth-saver/shared";
import * as v from "valibot";
import { CompressionMode, ExtensionData } from "@/shared/constants";

export const StorageAreaSchema = v.picklist([
	"local",
	"sync",
	"managed",
	"session",
]);
export type StorageAreaSchema = v.InferOutput<typeof StorageAreaSchema>;

export const GeneralSettingsSchema = v.object({
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
export type GeneralSettingsSchema = v.InferOutput<typeof GeneralSettingsSchema>;

export const CompressionSettingsSchema = v.object({
	/** `auto` results in default behaviour and is the fallback if a chosen format does not exist on a compression endpoint */
	format: ImageFormatSchema,
	mode: v.enum(CompressionMode),

	/** Used in `simple` mode since we can't dynamically calculate the one to use */
	preferredEndpoint: v.enum(ImageCompressorEndpoint),
	preserveAnim: v.boolean(),
	quality: NumberBetween1and100Inclusively,
});
export type CompressionSettingsSchema = v.InferOutput<
	typeof CompressionSettingsSchema
>;

export const ProxySettingsSchema = v.object({
	host: v.pipe(v.string(), v.minLength(1), v.trim()),
	port: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65535)),
});
export type ProxySettingsSchema = v.InferOutput<typeof ProxySettingsSchema>;

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
		v.optional(SingleAssetStatisticsSchema),
	),
});
export type CombinedAssetStatisticsSchema = v.InferOutput<
	typeof CombinedAssetStatisticsSchema
>;

export const StatisticsSchema = v.object({
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
export type StatisticsSchema = v.InferOutput<typeof StatisticsSchema>;

export const DetailedStatisticsSchema = v.object({
	...StatisticsSchema.entries,

	/** Requests from external sources that should technically be counted under the host's origin and not their standalone entries since they were created there.
	 *
	 * The url keys are also their url origin, (otherwise there'd be way too many bloat entries)
	 */
	crossOrigin: v.record(UrlSchema, CombinedAssetStatisticsSchema),
});
export type DetailedStatisticsSchema = v.InferOutput<
	typeof DetailedStatisticsSchema
>;

export const SchemaVersionSchema = v.pipe(
	v.number(),
	v.integer(),
	v.minValue(1),
);
export type SchemaVersionSchema = v.InferOutput<typeof SchemaVersionSchema>;

export const SiteUrlOriginsSchema = v.array(UrlSchema);
export type SiteUrlOriginsSchema = v.InferOutput<typeof SiteUrlOriginsSchema>;

const { VITE_SERVER_HOST, VITE_SERVER_PORT } = getExtensionEnv();

export const DEFAULT_COMPRESSION_SETTINGS = {
	format: "webp",
	mode: CompressionMode.SIMPLE,
	preferredEndpoint: ImageCompressorEndpoint.WSRV_NL,
	preserveAnim: false,
	quality: 60,
} as const satisfies CompressionSettingsSchema;

export const DEFAULT_PROXY_SETTINGS = {
	host: VITE_SERVER_HOST,
	port: VITE_SERVER_PORT,
} as const satisfies ProxySettingsSchema;

export const DEFAULT_GENERAL_SETTINGS = {
	block: true,
	bypassCsp: false,
	compression: true,
	enabled: true,
	lazyLoad: true,
	noAutoplay: true,
	ruleIdOffset: null,
	saveData: true,
} as const satisfies GeneralSettingsSchema;

export const DEFAULT_SINGLE_ASSET_STATISTICS = {
	audio: 0,
	font: 0,
	html: 0,
	image: 0,
	other: 0,
	script: 0,
	style: 0,
	video: 0,
} as const satisfies SingleAssetStatisticsSchema;

export const DEFAULT_COMBINED_ASSET_STATISTICS = {
	aggregate: DEFAULT_SINGLE_ASSET_STATISTICS,
	dailyStats: [],
} as const satisfies CombinedAssetStatisticsSchema;

export const DEFAULT_STATISTICS = {
	bytesSaved: { ...DEFAULT_COMBINED_ASSET_STATISTICS },
	bytesUsed: { ...DEFAULT_COMBINED_ASSET_STATISTICS },
	requestsCompressed: { ...DEFAULT_COMBINED_ASSET_STATISTICS },
	requestsMade: { ...DEFAULT_COMBINED_ASSET_STATISTICS },
} as const satisfies StatisticsSchema;

export const DEFAULT_SITE_SPECIFIC_STATISTICS = {
	...DEFAULT_STATISTICS,
	crossOrigin: {},
} as const satisfies DetailedStatisticsSchema;

export const DEFAULT_SCHEMA_VERSION =
	ExtensionData.VERSION as const satisfies SchemaVersionSchema;

export const DEFAULT_SITE_URL_ORIGINS =
	[] as const satisfies SiteUrlOriginsSchema;
