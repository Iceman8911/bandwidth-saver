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

const StatisticsSchema = v.object({
	bytesSaved: IntegerFromAtLeastZeroSchema,
	/** Total amount of data consumption after compression / blocking */
	bytesUsed: IntegerFromAtLeastZeroSchema,
	lastReset: v.optional(v.pipe(v.string(), v.isoTimestamp())),
	requestsBlocked: IntegerFromAtLeastZeroSchema,
	requestsCompressed: IntegerFromAtLeastZeroSchema,
	requestsProcessed: IntegerFromAtLeastZeroSchema,
});

const storageSchemaEntries = {
	[StorageKey.SETTINGS_GLOBAL]: GlobalSettingsSchema,
	[StorageKey.SETTINGS_COMPRESSION]: CompressionSettingsSchema,
	[StorageKey.SETTINGS_PROXY]: ProxySettingsSchema,
	[StorageKey.SETTINGS_BLOCK]: BlockSettingsSchema,
	[StorageKey.SETTINGS_SITE_SCOPE_BLOCK]: v.record(
		UrlSchema,
		BlockSettingsSchema,
	),
	[StorageKey.SETTINGS_SITE_SCOPE_COMPRESSION]: v.record(
		UrlSchema,
		CompressionSettingsSchema,
	),
	[StorageKey.SETTINGS_SITE_SCOPE_GLOBAL]: v.record(
		UrlSchema,
		GlobalSettingsSchema,
	),
	[StorageKey.SETTINGS_SITE_SCOPE_PROXY]: v.record(
		UrlSchema,
		ProxySettingsSchema,
	),
	[StorageKey.STATISTICS]: StatisticsSchema,
	[StorageKey.STATISTICS_SITE_SCOPE]: v.record(UrlSchema, StatisticsSchema),
	[StorageKey.SCHEMA_VERSION]: v.pipe(v.number(), v.integer(), v.minValue(1)),
	[StorageKey.SETTINGS_DENYLIST]: v.array(UrlSchema),
} as const satisfies Record<StorageKey, AnyValibotSchema>;

/**
 * Storage schema registry mapping each StorageKey to its Valibot schema.
 * Each key represents an independent storage entry that can be read/written separately.
 */
export const STORAGE_SCHEMA = v.object(storageSchemaEntries);
export type STORAGE_SCHEMA = v.InferOutput<typeof STORAGE_SCHEMA>;

const { VITE_SERVER_HOST, VITE_SERVER_PORT } = getExtensionEnv();

export const STORAGE_DEFAULTS = v.parse(STORAGE_SCHEMA, {
	[StorageKey.SETTINGS_GLOBAL]: { enabled: true },
	[StorageKey.SETTINGS_COMPRESSION]: {
		enabled: true,
		format: "auto",
		mode: CompressionMode.SIMPLE,
		preferredEndpoint: ImageCompressorEndpoint.WSRV_NL,
		preserveAnim: false,
		quality: 60,
	},
	[StorageKey.SETTINGS_PROXY]: {
		enabled: false,
		host: VITE_SERVER_HOST,
		port: VITE_SERVER_PORT,
	},
	[StorageKey.SETTINGS_BLOCK]: [
		{ enabled: false, fileType: "audio", minSize: 100, type: "type" },
		{ enabled: false, fileType: "font", minSize: 50, type: "type" },
		{ enabled: false, fileType: "image", minSize: 100, type: "type" },
		{ enabled: false, fileType: "video", minSize: 100, type: "type" },
	],
	[StorageKey.STATISTICS]: {
		bytesSaved: 0,
		bytesUsed: 0,
		requestsBlocked: 0,
		requestsCompressed: 0,
		requestsProcessed: 0,
	},
	[StorageKey.STATISTICS_SITE_SCOPE]: {},
	[StorageKey.SCHEMA_VERSION]: STORAGE_VERSION,
	[StorageKey.SETTINGS_DENYLIST]: [],
	[StorageKey.SETTINGS_SITE_SCOPE_BLOCK]: {},
	[StorageKey.SETTINGS_SITE_SCOPE_COMPRESSION]: {},
	[StorageKey.SETTINGS_SITE_SCOPE_GLOBAL]: {},
	[StorageKey.SETTINGS_SITE_SCOPE_PROXY]: {},
} as const satisfies STORAGE_SCHEMA);
