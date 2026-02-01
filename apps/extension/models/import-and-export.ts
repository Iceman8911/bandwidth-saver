import { UrlSchema } from "@bandwidth-saver/shared";
import * as v from "valibot";
import { StorageKey } from "@/shared/constants";
import {
	CompressionSettingsSchema,
	DetailedStatisticsSchema,
	GeneralSettingsSchema,
	ProxySettingsSchema,
	SchemaVersionSchema,
	SiteUrlOriginsSchema,
	StatisticsSchema,
} from "./storage";

const {
	DEFAULT_SETTINGS_COMPRESSION,
	DEFAULT_SETTINGS_GENERAL,
	DEFAULT_SETTINGS_PROXY,
	SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX,
	SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX,
	SITE_SPECIFIC_SETTINGS_PROXY_PREFIX,
	SITE_URL_ORIGINS,
	SCHEMA_VERSION,
	SITE_SPECIFIC_STATISTICS_PREFIX,
	STATISTICS,
} = StorageKey;

const DefaultGeneralSettingsSchema = v.object({
	[DEFAULT_SETTINGS_GENERAL]: GeneralSettingsSchema,
});
const DefaultCompressionSettingsSchema = v.object({
	[DEFAULT_SETTINGS_COMPRESSION]: CompressionSettingsSchema,
});
const DefaultProxySettingsSchema = v.object({
	[DEFAULT_SETTINGS_PROXY]: ProxySettingsSchema,
});
const GeneralStatisticsSchema = v.object({ [STATISTICS]: StatisticsSchema });

const pipeCheckToString = <TStringType extends string = string>(
	checker: (input: string) => boolean,
) =>
	v.pipe(
		v.string(),
		v.check(checker),
		v.transform((input) => input as TStringType),
	);

const SiteScopedGeneralSettingsSchema = v.record(
	pipeCheckToString<`${typeof SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX}${UrlSchema}`>(
		(input) => {
			const [_, possibleSiteOrigin] = input.split(
				SITE_SPECIFIC_SETTINGS_GENERAL_PREFIX,
			);

			return v.is(UrlSchema, possibleSiteOrigin);
		},
	),
	GeneralSettingsSchema,
);

const SiteScopedCompressionSettingsSchema = v.record(
	pipeCheckToString<`${typeof SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX}${UrlSchema}`>(
		(input) => {
			const [_, possibleSiteOrigin] = input.split(
				SITE_SPECIFIC_SETTINGS_COMPRESSION_PREFIX,
			);

			return v.is(UrlSchema, possibleSiteOrigin);
		},
	),
	CompressionSettingsSchema,
);

const SiteScopedProxySettingsSchema = v.record(
	pipeCheckToString<`${typeof SITE_SPECIFIC_SETTINGS_PROXY_PREFIX}${UrlSchema}`>(
		(input) => {
			const [_, possibleSiteOrigin] = input.split(
				SITE_SPECIFIC_SETTINGS_PROXY_PREFIX,
			);

			return v.is(UrlSchema, possibleSiteOrigin);
		},
	),
	ProxySettingsSchema,
);

const SiteScopedStatisticsSchema = v.record(
	pipeCheckToString<`${typeof SITE_SPECIFIC_STATISTICS_PREFIX}${UrlSchema}`>(
		(input) => {
			const [_, possibleSiteOrigin] = input.split(
				SITE_SPECIFIC_STATISTICS_PREFIX,
			);

			return v.is(UrlSchema, possibleSiteOrigin);
		},
	),
	DetailedStatisticsSchema,
);

const GeneralSiteUrlOriginsSchema = v.object({
	[SITE_URL_ORIGINS]: SiteUrlOriginsSchema,
});

const GeneralSchemaVersionSchema = v.object({
	[SCHEMA_VERSION]: SchemaVersionSchema,
});

export const SettingsExportDataSchema = v.object({
	...GeneralSchemaVersionSchema.entries,
	...GeneralSiteUrlOriginsSchema.entries,
	...GeneralStatisticsSchema.entries,

	...DefaultGeneralSettingsSchema.entries,
	...DefaultCompressionSettingsSchema.entries,
	...DefaultProxySettingsSchema.entries,

	site: v.object({
		compression: SiteScopedCompressionSettingsSchema,
		general: SiteScopedGeneralSettingsSchema,
		proxy: SiteScopedProxySettingsSchema,
		statistics: SiteScopedStatisticsSchema,
	}),
});
export type SettingsExportDataSchema = v.InferOutput<
	typeof SettingsExportDataSchema
>;
