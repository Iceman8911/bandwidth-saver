import {
	type AnyValibotSchema,
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

const CompressionSettingsSchema = v.object({
	...EnabledSettingsSchema.entries,
	/** `auto` results in default behaviour and is the fallback if a chosen format does not exist on a compression endpoint */
	format: v.optional(ImageFormatSchema, "auto"),
	mode: v.optional(v.enum(CompressionMode), CompressionMode.SIMPLE),
	quality: v.optional(NumberBetween1and100Inclusively, 60),
	preserveAnim: v.optional(v.boolean(), false),

	/** Used in `simple` mode since we can't dynamically calculate the one to use */
	preferredEndpoint: v.optional(v.enum(ImageCompressorEndpoint), ImageCompressorEndpoint.WSRV_NL)
});

const ProxySettingsSchema = v.object({
	...EnabledSettingsSchema.entries,
	host: v.pipe(v.string(), v.minLength(1), v.trim()),
	port: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65535)),
});

const BlockedAssetSchema = v.object({
	...EnabledSettingsSchema.entries,
	/** Minimum size in KB that assets must be at least to be blocked */
	minSize: v.pipe(v.number(), v.minValue(0)),
});

const BlockSettingsSchema = v.object({
	audio: BlockedAssetSchema,
	font: BlockedAssetSchema,
	image: BlockedAssetSchema,
	video: BlockedAssetSchema,
});

const StatisticsSchema = v.object({
	assetsBlocked: v.pipe(v.number(), v.integer(), v.minValue(0)),
	bytesSaved: v.pipe(v.number(), v.minValue(0)),
	imagesCompressed: v.pipe(v.number(), v.integer(), v.minValue(0)),
	lastReset: v.optional(v.pipe(v.string(), v.isoTimestamp())),
});

/** Collection of settings that may be applied to all sites, or a select few */
const CombinedSettingsSchema = v.object({
	block: BlockSettingsSchema,
	compression: CompressionSettingsSchema,
	proxy: ProxySettingsSchema,
	statistics: StatisticsSchema,
});

const storageSchemaEntries = {
	[StorageKey.SETTINGS_COMPRESSION]: CompressionSettingsSchema,
	[StorageKey.SETTINGS_PROXY]: ProxySettingsSchema,
	[StorageKey.SETTINGS_BLOCK]: BlockSettingsSchema,
	[StorageKey.SETTINGS_SITE_SCOPE]: v.record(UrlSchema, CombinedSettingsSchema),
	[StorageKey.SETTINGS_STATISTICS]: StatisticsSchema,
	[StorageKey.SCHEMA_VERSION]: v.pipe(v.number(), v.integer(), v.minValue(1)),
	[StorageKey.SETTINGS_DENYLIST]: v.array(UrlSchema),
} as const satisfies Record<StorageKey, AnyValibotSchema>;

/**
 * Storage schema registry mapping each StorageKey to its Valibot schema.
 * Each key represents an independent storage entry that can be read/written separately.
 */
export const STORAGE_SCHEMA = v.object(storageSchemaEntries);
export type STORAGE_SCHEMA = v.InferOutput<typeof STORAGE_SCHEMA>;

export const STORAGE_DEFAULTS = v.parse(STORAGE_SCHEMA, {
	[StorageKey.SETTINGS_COMPRESSION]: {
		enabled: true,
		format: "webp",
		mode: CompressionMode.SIMPLE,
		quality: 60,
		preserveAnim: false,
		preferredEndpoint: ImageCompressorEndpoint.WSRV_NL
	},
	[StorageKey.SETTINGS_PROXY]: {
		enabled: false,
		host: "localhost",
		port: 3000,
	},
	[StorageKey.SETTINGS_BLOCK]: {
		audio: { enabled: false, minSize: 100 },
		font: { enabled: false, minSize: 50 },
		image: { enabled: false, minSize: 100 },
		video: { enabled: false, minSize: 500 },
	},
	[StorageKey.SETTINGS_STATISTICS]: {
		assetsBlocked: 0,
		bytesSaved: 0,
		imagesCompressed: 0,
	},
	[StorageKey.SCHEMA_VERSION]: STORAGE_VERSION,
	[StorageKey.SETTINGS_DENYLIST]: [],
	[StorageKey.SETTINGS_SITE_SCOPE]: {},
} as const satisfies STORAGE_SCHEMA);
