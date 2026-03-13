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
export type StorageAreaOutput = v.InferOutput<typeof StorageAreaSchema>;

export const GeneralSettingsSchema = v.object({
	/** Whether the csp headers should be removed.
	 *
	 * NOT ADVISED unless you know what you're doing.
	 */
	bypassCsp: v.boolean(),

	/** Replaces `no-store` and similar cache headers on html resources with more cache-friendly ones that won't result in outdated content. However, it may not be ideal for sensitive content like banking sites. */
	cacheHtmlBetter: v.boolean(),

	/** If disabled, no compression at all is applied */
	compression: v.boolean(),

	/** If `false`, completely disables all functionality for the default / site-specific settings */
	enabled: v.boolean(),

	/** If `true`, modifies all relevant html elements to lazily load their content and also sets up a mutation observer for dynamically inserted elements */
	lazyLoad: v.boolean(),

	/** If `true`, disables autoplaying of videos and audio  */
	noAutoplay: v.boolean(),

	/** Whether the save data header should be applied to each request */
	saveData: v.boolean(),

	/** Modify `navigator.connection.effectiveType` when present to make it seems like the user's network is slower than it actually is. Some sites may serve lower quality content if so. */
	spoofSlowNetwork: v.picklist(["default", "3g", "2g", "slow-2g"]),

	/** If `true`, the site will use it's own scoped rules over the default, else it fallback to the default.
	 *
	 * If `enabled` is false, this has no effect
	 *
	 * If this object for the default settings, this value will always be `false`
	 */
	useSiteRule: v.boolean(),
});
export type GeneralSettingsOutput = v.InferOutput<typeof GeneralSettingsSchema>;

export const CompressionSettingsSchema = v.object({
	/** `auto` results in default behaviour and is the fallback if a chosen format does not exist on a compression endpoint */
	format: ImageFormatSchema,
	mode: v.enum(CompressionMode),

	/** Used in `simple` mode since we can't dynamically calculate the one to use */
	preferredEndpoint: v.enum(ImageCompressorEndpoint),
	/** This is best effort.
	 *
	 * If `false`, non-animated images from compression will be returned wherever possible. If not, it fallback to any compressor endpoint / technique that works, and then the original url.
	 *
	 * If `true`, animated images from compression will be preserved wherever possible. If not, it fallback to any compressor endpoint / technique that works, and then the original url.
	 */
	preserveAnim: v.boolean(),
	quality: NumberBetween1and100Inclusively,
});
export type CompressionSettingsOutput = v.InferOutput<
	typeof CompressionSettingsSchema
>;

export const BlockSettingsSchema = v.object({
	/** Blocks all remote fonts.
	 *
	 * Since the browser will fallback to system fonts, this is the only acceptable blocking functionality.
	 *
	 * NOTE: This will break icon fonts like FontAwesome. SVG icons are better anyway :p
	 */
	font: v.boolean(),
	/** 2nd most useful one */
	image: v.boolean(),
	/** Most useful one */
	media: v.boolean(),
	/** Breaks non-progressive site */
	script: v.boolean(),
	/** Uglifies sites */
	style: v.boolean(),
});
export type BlockSettingsOutput = v.InferOutput<typeof BlockSettingsSchema>;

export const ProxySettingsSchema = v.object({
	/** Optional cloudinary cloud name to enable cloudinary-based processing */
	cloudinary: v.optional(v.string()),

	endpoint: v.object({ backups: v.array(UrlSchema), main: UrlSchema }),

	/** Whether the proxy should manually do the transformations, or attempt to tranfer the load to other public endpoints. */
	forceManual: v.optional(v.boolean()),
});
export type ProxySettingsOutput = v.InferOutput<typeof ProxySettingsSchema>;

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
export type SingleAssetStatisticsOutput = v.InferOutput<
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
export type CombinedAssetStatisticsOutput = v.InferOutput<
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
export type StatisticsOutput = v.InferOutput<typeof StatisticsSchema>;

export const DetailedStatisticsSchema = v.object({
	...StatisticsSchema.entries,

	/** Requests from external sources that should technically be counted under the host's origin and not their standalone entries since they were created there.
	 *
	 * The url keys are also their url origin, (otherwise there'd be way too many bloat entries)
	 */
	crossOrigin: v.record(UrlSchema, CombinedAssetStatisticsSchema),
});
export type DetailedStatisticsOutput = v.InferOutput<
	typeof DetailedStatisticsSchema
>;

export const SchemaVersionSchema = v.pipe(
	v.number(),
	v.integer(),
	v.minValue(1),
);
export type SchemaVersionOutput = v.InferOutput<typeof SchemaVersionSchema>;

export const SiteUrlOriginsSchema = v.array(UrlSchema);
export type SiteUrlOriginsOutput = v.InferOutput<typeof SiteUrlOriginsSchema>;

const { VITE_SERVER_HOST, VITE_SERVER_PORT } = getExtensionEnv();

export const DEFAULT_COMPRESSION_SETTINGS = {
	format: "auto",
	mode: CompressionMode.SIMPLE,
	preferredEndpoint: ImageCompressorEndpoint.WSRV_NL,
	preserveAnim: false,
	quality: 60,
} as const satisfies CompressionSettingsOutput;

export const DEFAULT_PROXY_SETTINGS = {
	endpoint: {
		backups: [],
		main: `http://${VITE_SERVER_HOST}:${VITE_SERVER_PORT}` as UrlSchema,
	},
} as const satisfies ProxySettingsOutput;

export const DEFAULT_GENERAL_SETTINGS = {
	bypassCsp: false,
	cacheHtmlBetter: false,
	compression: true,
	enabled: true,
	lazyLoad: true,
	noAutoplay: true,
	saveData: true,
	spoofSlowNetwork: "default",
	useSiteRule: false,
} as const satisfies GeneralSettingsOutput;

export const DEFAULT_BLOCK_SETTINGS = {
	font: false,
	image: false,
	media: false,
	script: false,
	style: false,
} as const satisfies BlockSettingsOutput;

export const DEFAULT_SINGLE_ASSET_STATISTICS = {
	audio: 0,
	font: 0,
	html: 0,
	image: 0,
	other: 0,
	script: 0,
	style: 0,
	video: 0,
} as const satisfies SingleAssetStatisticsOutput;

export const DEFAULT_COMBINED_ASSET_STATISTICS = {
	aggregate: DEFAULT_SINGLE_ASSET_STATISTICS,
	dailyStats: {},
} as const satisfies CombinedAssetStatisticsOutput;

export const DEFAULT_STATISTICS = {
	bytesSaved: { ...DEFAULT_COMBINED_ASSET_STATISTICS },
	bytesUsed: { ...DEFAULT_COMBINED_ASSET_STATISTICS },
	requestsCompressed: { ...DEFAULT_COMBINED_ASSET_STATISTICS },
	requestsMade: { ...DEFAULT_COMBINED_ASSET_STATISTICS },
} as const satisfies StatisticsOutput;

export const DEFAULT_SITE_SPECIFIC_STATISTICS = {
	...DEFAULT_STATISTICS,
	crossOrigin: {},
} as const satisfies DetailedStatisticsOutput;

export const DEFAULT_SCHEMA_VERSION =
	ExtensionData.VERSION as const satisfies SchemaVersionOutput;

export const DEFAULT_SITE_URL_ORIGINS =
	[] as const satisfies SiteUrlOriginsOutput;
